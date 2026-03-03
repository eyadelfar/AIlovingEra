import json

from app.interfaces.prompt_builder import AbstractPromptBuilder
from app.models.schemas import BookGenerationRequest, RegenerateTextRequest
from app.prompts import load_system_prompt
from app.prompts.layout_rules import LAYOUT_PALETTE
from app.prompts.structure_guides import STRUCTURE_GUIDES
from app.prompts.vibe_guides import VIBE_GUIDES
from app.prompts.yaml_loader import load_yaml, load_all_yaml_dir
from app.constants import IMAGE_LOOK_PROMPTS


class MemoryBookPromptBuilder(AbstractPromptBuilder):
    """Builds prompts for the memory book pipeline."""

    # ── Helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def _compose_section(section_name: str, variables: dict | None = None) -> str:
        """Load prompt fragment from prompt_sections.yaml and fill template variables."""
        sections = load_yaml("prompt_sections.yaml")
        text = sections.get(section_name, "")
        if variables:
            try:
                text = text.format(**variables)
            except (KeyError, IndexError):
                pass  # Leave unreplaced placeholders
        return text

    @staticmethod
    def _load_few_shot_examples(vibe: str) -> str:
        """Load few-shot examples for a given vibe from YAML."""
        all_examples = load_all_yaml_dir("few_shot_examples")
        vibe_examples = all_examples.get(vibe, {})
        if not vibe_examples:
            return ""

        examples = vibe_examples.get("examples", [])
        if not examples:
            return ""

        lines = ["\nFEW-SHOT EXAMPLES (match this quality and tone):"]
        for i, ex in enumerate(examples, 1):
            expected = ex.get("expected", {})
            lines.append(f"\n  Example {i}: {ex.get('context', '')}")
            lines.append(f"    Layout: {expected.get('layout', '?')}")
            if expected.get("heading_text"):
                lines.append(f"    Heading: \"{expected['heading_text']}\"")
            if expected.get("body_text"):
                lines.append(f"    Body: \"{expected['body_text']}\"")
            if expected.get("caption_text"):
                lines.append(f"    Caption: \"{expected['caption_text']}\"")
            if expected.get("quote_text"):
                lines.append(f"    Quote: \"{expected['quote_text']}\"")

        return "\n".join(lines)

    @staticmethod
    def _load_density_guide(density: str) -> dict:
        """Load density guide from YAML."""
        guides = load_yaml("density_guides.yaml")
        return guides.get(density, guides.get("balanced", {}))

    @staticmethod
    def _format_names(partner_names: list[str]) -> tuple[str, str]:
        """Parse comma-separated name entries into a structured names block for the AI."""
        if not partner_names or not any(n.strip() for n in partner_names):
            return "", "COUPLE: (names not provided)"

        parsed: list[list[str]] = []
        for entry in partner_names:
            names = [n.strip() for n in entry.split(",") if n.strip()]
            if names:
                parsed.append(names)

        if not parsed:
            return "", "COUPLE: (names not provided)"

        short = " & ".join(p[0] for p in parsed)

        lines = ["NAMES:"]
        for i, names in enumerate(parsed, start=1):
            primary = names[0]
            if len(names) > 1:
                nicknames = ", ".join(names[1:])
                lines.append(f"  Person {i}: {primary} (also called: {nicknames})")
            else:
                lines.append(f"  Person {i}: {primary}")
        lines.append("Use any of these names and nicknames naturally and interchangeably throughout the book.")

        return short, "\n".join(lines)

    @staticmethod
    def _build_density_hint(request: BookGenerationRequest) -> str:
        density = request.image_density.value if request.image_density else "balanced"
        guides = load_yaml("density_guides.yaml")
        guide = guides.get(density, guides.get("balanced", {}))
        return (
            f"DENSITY GUIDE ({density}):\n"
            f"- Photos per spread: {guide.get('photos_per_spread', '1-2')}\n"
            f"- Preferred layouts: {guide.get('preferred_layouts', 'balanced mix')}\n"
            f"- Whitespace: {guide.get('whitespace', 'moderate')}"
        )

    @staticmethod
    def _build_addons_hint(request: BookGenerationRequest) -> str:
        parts: list[str] = []
        if request.add_ons.love_letter_insert:
            parts.append('Generate a "love_letter_text" field: a 150-250 word heartfelt love letter.')
        if request.add_ons.audio_qr_codes:
            parts.append('Generate "audio_qr_chapter_labels": short spoken-word labels for each chapter.')
        if request.add_ons.anniversary_edition_cover:
            parts.append('Generate "anniversary_cover_text": a special anniversary tagline (one sentence).')
        if request.add_ons.mini_reel_storyboard:
            parts.append('Generate "mini_reel_frames": 8-12 one-sentence scene descriptions for a short video reel.')
        if not parts:
            return ""
        return "\n\nADD-ON CONTENT TO GENERATE:\n" + "\n".join(f"- {p}" for p in parts)

    # ── Stage B: Photo analysis + clustering ─────────────────────────────

    def build_photo_analysis_prompt(
        self,
        num_photos: int,
        metadata: list[dict] | None = None,
    ) -> str:
        base = self._compose_section("photo_analysis_base", {"num_photos": num_photos})
        cot = self._compose_section("chain_of_thought_header")
        quality = self._compose_section("quality_scoring_instructions")
        anti_cringe = self._compose_section("anti_cringe_rules")

        meta_block = ""
        if metadata:
            lines = []
            for m in metadata:
                parts = [f"Photo {m.get('photo_index', '?')}"]
                if m.get("exif_date"):
                    parts.append(f"exif_date={m['exif_date']}")
                parts.append(f"aspect={m.get('aspect_ratio', '?')}")
                parts.append(f"orient={m.get('orientation', '?')}")
                if m.get("width"):
                    parts.append(f"{m['width']}x{m.get('height', '?')}")
                if m.get("blur_score", 0) > 0:
                    parts.append(f"blur={m.get('blur_score', 0):.2f}")
                if m.get("exposure_quality", 0) > 0:
                    parts.append(f"exposure={m.get('exposure_quality', 0):.2f}")
                lines.append(" | ".join(parts))
            meta_block = (
                "\n\nKNOWN METADATA (from EXIF / file info):\n"
                + "\n".join(lines)
                + "\nUse this to confirm or refine your date/time estimates. "
                "Prefer EXIF dates over visual guesses when available.\n"
            )

        return f"""{base}
{cot}
{quality}
{anti_cringe}
{meta_block}
For EACH photograph (indexed 0 to {num_photos - 1}), analyze and return structured JSON.

For each photo provide:
- photo_index: the 0-based index
- description: detailed description of the scene, people, setting, objects (ONLY what you see)
- scene_type: a short descriptive label
- emotion: the dominant emotion you observe
- people_count: number of people visible
- tags: 3-5 descriptive tags
- suggested_caption: a warm, personal caption (8-18 words) — specific to THIS photo
- story_relevance: how this photo fits into the story (1-2 sentences)
- cluster_id: group related photos (same event/location/time) using integer IDs starting at 0
- estimated_date_hint: best guess of season/time-of-day
- date_confidence: 0.0-1.0
- hero_candidate: true if standout photo
- face_regions: array of crop boxes {{x, y, w, h}} (0-1 normalized)
- safe_crop_box: {{x, y, w, h}} (0-1 normalized)
- activity: what subjects are doing
- mood: emotional tone
- composition_score: 0.0-1.0
- quality_score: 0.0-1.0 composite
- is_book_worthy: true/false
- book_worthiness_reason: if false, explain why
- narrative_role: "opener", "climax", "transition", "detail", or "filler"

Also provide a "clusters" summary with:
- cluster_id, label_guess, label_confidence, time_range, image_ids, hero_candidates, cohesion_score

Respond ONLY with valid JSON, no markdown fences:
{{
  "reasoning": "Brief chain-of-thought about the collection...",
  "photos": [
    {{
      "photo_index": 0,
      "description": "...",
      "scene_type": "outdoor",
      "emotion": "romantic",
      "people_count": 2,
      "tags": ["park", "autumn", "couple"],
      "suggested_caption": "Where it all began...",
      "story_relevance": "Opening scene.",
      "cluster_id": 0,
      "estimated_date_hint": "autumn afternoon",
      "date_confidence": 0.6,
      "hero_candidate": true,
      "face_regions": [{{"x": 0.3, "y": 0.1, "w": 0.4, "h": 0.5}}],
      "safe_crop_box": {{"x": 0.1, "y": 0.0, "w": 0.8, "h": 0.9}},
      "activity": "sitting",
      "mood": "tender",
      "composition_score": 0.85,
      "quality_score": 0.9,
      "is_book_worthy": true,
      "book_worthiness_reason": "",
      "narrative_role": "opener"
    }}
  ],
  "clusters": [
    {{
      "cluster_id": 0,
      "label_guess": "park date",
      "label_confidence": 0.7,
      "time_range": {{"start": "autumn 2023", "end": "autumn 2023"}},
      "image_ids": [0, 1, 2],
      "hero_candidates": [0],
      "cohesion_score": 0.85
    }}
  ]
}}
"""

    # ── Stage C: Planning (structure only, no text) ───────────────────────

    def _build_language_instruction(self, locale: str) -> str:
        """Return a language instruction block for non-English locales."""
        language_name = self._LOCALE_TO_LANGUAGE.get(locale, "English")
        if language_name == "English":
            return ""
        return f"""
LANGUAGE: You MUST generate ALL text content (titles, subtitles, chapter titles, headings, body text, captions, quotes, dedications, blurbs, closing text) in {language_name}.
Do NOT translate proper nouns or names. Keep layout_id values and JSON keys in English.
"""

    def build_planning_prompt(
        self,
        request: BookGenerationRequest,
        photo_analyses: list[dict],
        clusters: list[dict] | None = None,
        quality_scores: list[dict] | None = None,
    ) -> str:
        planning_instructions = self._compose_section("planning_instructions")
        names, names_block = self._format_names(request.partner_names)

        effective_vibe = request.vibe or "romantic_warm"
        vibe_guide = VIBE_GUIDES.get(effective_vibe, VIBE_GUIDES["romantic_warm"])

        effective_structure = request.structure_template or "classic_timeline"
        struct_guide = STRUCTURE_GUIDES.get(effective_structure, STRUCTURE_GUIDES["classic_timeline"])

        num_photos = len(photo_analyses)
        typical_chapters = struct_guide.get("typical_chapters", [])
        min_chapters = max(3, min(len(typical_chapters) if typical_chapters else 5, num_photos // 3))

        # Layout palette for the AI
        layout_text = "\n".join(
            f"- {lid}: {info['description']} (photos: {info['photo_count'][0]}-{info['photo_count'][1]}, density: {info['density_class']})"
            for lid, info in LAYOUT_PALETTE.items()
        )

        # Vibe-layout affinities
        vibe_affinities = []
        layout_prefs = vibe_guide.get("layout_preferences", {})
        if layout_prefs:
            preferred = layout_prefs.get("preferred", [])
            avoid = layout_prefs.get("avoid", [])
            if preferred:
                vibe_affinities.append(f"  Preferred for {effective_vibe}: {', '.join(preferred)}")
            if avoid:
                vibe_affinities.append(f"  Avoid for {effective_vibe}: {', '.join(avoid)}")
        vibe_affinity_text = "\n".join(vibe_affinities)

        # Photo analyses summary
        analyses_text = "\n".join(
            f"Photo {a.get('photo_index', i)} "
            f"(cluster={a.get('cluster_id', '?')}, "
            f"hero={a.get('hero_candidate', False)}, "
            f"quality={a.get('quality_score', '?')}, "
            f"role={a.get('narrative_role', '?')}, "
            f"worthy={a.get('is_book_worthy', True)}, "
            f"dup={a.get('is_duplicate', False)}, "
            f"aspect={a.get('aspect_ratio', '?')}): "
            f"{a.get('description', '')[:80]}"
            for i, a in enumerate(photo_analyses)
        )

        clusters_text = ""
        if clusters:
            clusters_text = "\n\nCLUSTERS:\n" + json.dumps(clusters, indent=2)

        # Layout distribution from structure guide
        layout_dist = struct_guide.get("layout_distribution", {})
        layout_dist_text = ""
        if layout_dist:
            layout_dist_text = "\nRECOMMENDED LAYOUT DISTRIBUTION:\n" + "\n".join(
                f"  {lid}: {pct*100:.0f}%" for lid, pct in layout_dist.items()
            )

        # Photo count scaling
        scaling = struct_guide.get("photo_count_scaling", [])
        scaling_text = ""
        if scaling:
            for s in scaling:
                r = s.get("range", [0, 0])
                if r[0] <= num_photos <= r[1]:
                    scaling_text = f"\nRECOMMENDED CHAPTERS for {num_photos} photos: {s.get('chapters', 5)}"
                    break

        page_target = request.design_scale.page_count_target if request.design_scale else 24

        return f"""{planning_instructions}

{names_block}

VIBE: {effective_vibe}
- Layout preferences: {json.dumps(layout_prefs)}
{vibe_affinity_text}

STRUCTURE: {effective_structure}
- Strategy: {struct_guide.get('chapter_strategy', 'chronological')}
- Typical chapters: {json.dumps(typical_chapters)}
- Pacing: {struct_guide.get('pacing_hint', '')}
{layout_dist_text}
{scaling_text}

LAYOUT PALETTE:
{layout_text}

TARGET PAGE COUNT: ~{page_target}
TOTAL PHOTOS: {num_photos}
MINIMUM CHAPTERS: {min_chapters}

ANALYZED PHOTOS:
{analyses_text}
{clusters_text}

{self._build_density_hint(request)}

Respond ONLY with valid JSON:
{{
  "reasoning": "Brief chain-of-thought about structure decisions...",
  "chapters": [
    {{
      "chapter_index": 0,
      "title": "chapter title placeholder",
      "theme": "what this chapter is about",
      "photo_indices": [0, 1, 2],
      "spreads": [
        {{
          "spread_index": 0,
          "layout_id": "HERO_FULLBLEED",
          "photo_indices": [0],
          "is_hero": true,
          "is_breather": false
        }}
      ]
    }}
  ],
  "dedication_placement": "before_chapter_0",
  "closing_placement": "after_last_chapter"
}}
{self._build_language_instruction(request.locale)}"""

    # ── Stage D: Writing (all narrative text for planned structure) ────────

    def build_writing_prompt(
        self,
        request: BookGenerationRequest,
        plan: dict,
        photo_analyses: list[dict],
    ) -> str:
        writing_base = self._compose_section("narrative_writing_base")
        anti_cringe = self._compose_section("anti_cringe_rules")

        names, names_block = self._format_names(request.partner_names)

        effective_vibe = request.vibe or "romantic_warm"
        vibe_guide = VIBE_GUIDES.get(effective_vibe, VIBE_GUIDES["romantic_warm"])

        # Load few-shot examples for the vibe
        few_shot_text = self._load_few_shot_examples(effective_vibe)

        # Quote style guidance
        quote_style = vibe_guide.get("quote_style", {})
        quote_tone = quote_style.get("tone", "")
        seed_quotes = quote_style.get("seed_examples", [])
        quote_guidance = ""
        if quote_tone:
            quote_guidance = f"\nQUOTE STYLE: {quote_tone}"
            if seed_quotes:
                quote_guidance += "\nSeed examples (match this TONE, do NOT copy directly):"
                for sq in seed_quotes:
                    quote_guidance += f'\n  - "{sq}"'

        # Heading style
        heading_style = vibe_guide.get("heading_style", {})
        heading_guidance = ""
        if heading_style:
            heading_guidance = f"\nHEADING STYLE: {heading_style.get('tone', '')}"
            examples = heading_style.get("examples", [])
            if examples:
                heading_guidance += f"\n  Examples: {', '.join(examples)}"

        # Few-shot caption examples from vibe guide
        caption_examples = vibe_guide.get("few_shot_captions", [])
        caption_text = ""
        if caption_examples:
            caption_text = "\nCAPTION EXAMPLES (good vs bad):"
            for ce in caption_examples:
                caption_text += f'\n  Photo: "{ce.get("photo_desc", "")}"'
                caption_text += f'\n    GOOD: "{ce.get("good", "")}"'
                caption_text += f'\n    BAD: "{ce.get("bad", "")}"'

        # Story context
        story_hint = f'\nTheir story: "{request.user_story_text}"' if request.user_story_text.strip() else ""
        occasion_hint = f"\nSpecial occasion: {request.special_occasion}" if request.special_occasion else ""

        answers_hint = ""
        if request.question_answers:
            lines = [f"- Q({a.question_id}): {a.answer_text}" for a in request.question_answers if a.answer_text.strip()]
            if lines:
                answers_hint = "\n\nANSWERS FROM THE COUPLE:\n" + "\n".join(lines)

        # Photo analyses lookup
        analyses_text = "\n".join(
            f"Photo {a.get('photo_index', i)}: {a.get('description', '')} | "
            f"Emotion: {a.get('emotion', '')} | Mood: {a.get('mood', '')} | "
            f"Activity: {a.get('activity', '')}"
            for i, a in enumerate(photo_analyses)
        )

        # The plan structure
        plan_text = json.dumps(plan, indent=2)

        addons_hint = self._build_addons_hint(request)

        return f"""{writing_base}
{anti_cringe}

{names_block}
{story_hint}{occasion_hint}{answers_hint}

VIBE: {effective_vibe}
- Writing style: {vibe_guide.get('writing_style', '')}
- Caption range: {vibe_guide.get('caption_range', [8, 18])} words
- Humor level: {vibe_guide.get('humor_level', 2)}/10
- Avoid: {', '.join(vibe_guide.get('avoid', []))}
{heading_guidance}
{quote_guidance}
{caption_text}
{few_shot_text}

STRUCTURAL PLAN (generate text for each spread):
{plan_text}

PHOTO ANALYSES:
{analyses_text}
{addons_hint}

Generate ALL text content for the planned structure. For EACH spread, provide:
- heading_text, body_text, caption_text, quote_text (where applicable)

Also generate:
- title, subtitle, dedication text, overall_narrative, closing_page text
- title_options (3-5 alternatives)
- covers (1-2 cover options with cover_art_prompt)

Respond ONLY with valid JSON:
{{
  "title": "...",
  "subtitle": "...",
  "dedication": "...",
  "overall_narrative": "2-3 sentence story arc",
  "titles": [{{"title": "...", "subtitle": "..."}}],
  "covers": [{{"cover_id": "c1", "cover_style": "...", "cover_art_prompt": "...", "title": "...", "subtitle": "..."}}],
  "chapters": [
    {{
      "chapter_index": 0,
      "title": "...",
      "blurb": "40-90 word unique summary",
      "spreads": [
        {{
          "spread_index": 0,
          "layout_id": "...",
          "photo_indices": [...],
          "heading_text": "...",
          "body_text": "...",
          "caption_text": "...",
          "quote_text": "..."
        }}
      ]
    }}
  ],
  "closing_page": {{"text": "...", "style_notes": "..."}},
  "vibe": "{effective_vibe}"
}}
{self._build_language_instruction(request.locale)}"""

    # ── Stage D+E: Full book plan (single-pass fallback) ──────────────────

    def build_narrative_prompt(
        self,
        request: BookGenerationRequest,
        photo_analyses: list[dict],
        clusters: list[dict] | None = None,
        structure_guide: dict | None = None,
        template_config: dict | None = None,
    ) -> str:
        system_prompt = load_system_prompt()
        anti_cringe = self._compose_section("anti_cringe_rules")

        names, names_block = self._format_names(request.partner_names)

        effective_vibe = request.vibe or "romantic_warm"
        vibe_guide = VIBE_GUIDES.get(effective_vibe, VIBE_GUIDES["romantic_warm"])

        effective_structure = request.structure_template or "classic_timeline"
        struct_guide = structure_guide or STRUCTURE_GUIDES.get(effective_structure, STRUCTURE_GUIDES["classic_timeline"])

        # Load few-shot examples
        few_shot_text = self._load_few_shot_examples(effective_vibe)

        # Quote style guidance (AI-generated, not pool-based)
        quote_style = vibe_guide.get("quote_style", {})
        quote_guidance = ""
        if quote_style:
            quote_guidance = f"\nQUOTE GENERATION: Generate quotes matching tone: {quote_style.get('tone', '')}"
            seed = quote_style.get("seed_examples", [])
            if seed:
                quote_guidance += "\nSeed examples (for tone calibration, do NOT copy):"
                for s in seed:
                    quote_guidance += f'\n  - "{s}"'

        # Context fragments
        occasion_hint = f"\nSpecial occasion: {request.special_occasion}" if request.special_occasion else ""
        story_hint = f'\nTheir story in their own words: "{request.user_story_text}"' if request.user_story_text.strip() else ""

        answers_hint = ""
        if request.question_answers:
            lines = [f"- Q({a.question_id}): {a.answer_text}" for a in request.question_answers if a.answer_text.strip()]
            if lines:
                answers_hint = "\n\nANSWERS FROM THE COUPLE (weave naturally into narrative):\n" + "\n".join(lines)

        constraints_hint = ""
        if request.constraints:
            constraints_hint = "\n\nUSER CONSTRAINTS (parse as hard_constraints):\n" + "\n".join(f"- {c}" for c in request.constraints)

        addons_hint = self._build_addons_hint(request)

        num_photos = len(photo_analyses)
        analyses_text = "\n".join(
            f"Photo {a.get('photo_index', i)} "
            f"(cluster={a.get('cluster_id', '?')}, "
            f"date={a.get('estimated_date_hint', '?')}, "
            f"conf={a.get('date_confidence', 0)}, "
            f"hero={a.get('hero_candidate', False)}, "
            f"quality={a.get('quality_score', '?')}, "
            f"role={a.get('narrative_role', '?')}, "
            f"aspect={a.get('aspect_ratio', a.get('safe_crop_box', {}).get('w', '?'))}): "
            f"{a.get('description', '')} | "
            f"Emotion: {a.get('emotion', '')} | "
            f"Scene: {a.get('scene_type', '')} | "
            f"Tags: {a.get('tags', [])}"
            for i, a in enumerate(photo_analyses)
        )

        clusters_text = ""
        if clusters:
            clusters_text = "\n\nCLUSTERS (from photo analysis):\n" + json.dumps(clusters, indent=2)

        layout_text = "\n".join(
            f"- {lid}: {info['description']} (photos: {info['photo_count'][0]}-{info['photo_count'][1]}, density: {info['density_class']})"
            for lid, info in LAYOUT_PALETTE.items()
        )

        # Template design config (without quote_pool — AI generates quotes)
        template_hint = ""
        if template_config:
            ai_tone = template_config.get("ai_tone", "")
            ai_style = template_config.get("ai_style_prompt", "")
            font_cfg = template_config.get("font_config", {})
            tpl_name = template_config.get("name", "")

            parts = [f"\nTEMPLATE DESIGN: {tpl_name}"]
            if ai_tone:
                parts.append(f"- Narrative tone: {ai_tone} — match this mood in ALL text")
            if ai_style:
                parts.append(f"- Visual style: {ai_style}")
            if font_cfg:
                heading_font = font_cfg.get("heading", "")
                body_font = font_cfg.get("body", "")
                if heading_font or body_font:
                    parts.append(f"- Fonts: heading={heading_font}, body={body_font}")
            template_hint = "\n".join(parts)

        page_target = request.design_scale.page_count_target if request.design_scale else 24

        typical_chapters = struct_guide.get("typical_chapters", [])
        min_chapters = max(3, min(len(typical_chapters) if typical_chapters else 5, num_photos // 3))

        return f"""{system_prompt}

{anti_cringe}

--- SESSION CONTEXT ---

{names_block}{occasion_hint}{story_hint}{answers_hint}{constraints_hint}

SELECTED VIBE: {effective_vibe}
VIBE GUIDE:
- Writing style: {vibe_guide.get('writing_style', '')}
- Caption word range: {vibe_guide.get('caption_range', [8, 18])[0]}-{vibe_guide.get('caption_range', [8, 18])[1]} words
- Humor level: {vibe_guide.get('humor_level', 2)}/10
- Density preference: {vibe_guide.get('density_preference', 'balanced')}
- Avoid: {', '.join(vibe_guide.get('avoid', []))}
{quote_guidance}

SELECTED STRUCTURE TEMPLATE: {effective_structure}
- Strategy: {struct_guide.get('chapter_strategy', 'chronological')}
- REQUIRED CHAPTERS (generate at least {min_chapters}): {json.dumps(typical_chapters)}
- Pacing: {struct_guide.get('pacing_hint', '')}

CHRONOLOGICAL RULE: Photos are provided in approximate chronological order by index.
Index 0 = earliest memory, index {num_photos - 1} = most recent.
RESPECT this order when building chapters.

LAYOUT PALETTE (you MUST choose from these):
{layout_text}

TARGET PAGE COUNT: ~{page_target} pages
IMAGE LOOK: {request.image_look.value if request.image_look else 'natural'}
IMAGE DENSITY: {request.image_density.value if request.image_density else 'balanced'}
{self._build_density_hint(request)}
TOTAL PHOTOS: {num_photos}

ANALYZED PHOTOS:
{analyses_text}
{clusters_text}
{template_hint}
{addons_hint}
{few_shot_text}

OUTPUT FORMAT — return ONLY valid JSON (no markdown fences):
{{
  "version": "1.0",
  "metadata": {{
    "vibe": "{effective_vibe}",
    "template": "{effective_structure}",
    "image_look": "{request.image_look.value if request.image_look else 'natural'}",
    "size": "{request.design_scale.page_size.value if request.design_scale else 'a4'}",
    "page_count": <actual page count>,
    "confidence": {{
      "timeline": 0.0-1.0,
      "wedding_cluster": 0.0-1.0,
      "overall": 0.0-1.0
    }}
  }},
  "titles": [{{ "title": "...", "subtitle": "..." }}],
  "covers": [
    {{ "cover_id": "c1", "cover_style": "...", "cover_art_prompt": "...", "typography_notes": "...", "title": "...", "subtitle": "..." }}
  ],
  "dedication_page": {{ "text": "...", "style_notes": "..." }},
  "chapters": [
    {{
      "chapter_index": 0,
      "title": "...",
      "blurb": "40-90 word summary — UNIQUE per chapter",
      "spreads": [
        {{
          "spread_index": 0,
          "layout_id": "HERO_FULLBLEED|TWO_BALANCED|THREE_GRID|FOUR_GRID|SIX_MONTAGE|WALL_8_10|PHOTO_PLUS_QUOTE|COLLAGE_PLUS_LETTER|QUOTE_PAGE|DEDICATION|TOC_SIMPLE",
          "photo_indices": [0, 1],
          "heading_text": "...",
          "body_text": "...",
          "caption_text": "...",
          "quote_text": "...",
          "assigned_clusters": ["0"],
          "design_notes": "..."
        }}
      ]
    }}
  ],
  "closing_page": {{ "text": "...", "style_notes": "..." }},
  "edit_suggestions": ["suggestion 1", "suggestion 2"],
  "title": "<chosen best title>",
  "subtitle": "<chosen best subtitle>",
  "dedication": "<dedication text>",
  "overall_narrative": "<2-3 sentence story arc summary>",
  "vibe": "{effective_vibe}"
}}

LAYOUT VARIETY IS CRITICAL:
- Do NOT use HERO_FULLBLEED for every spread.
- For {num_photos} photos, aim for variety: 3-4 HERO_FULLBLEED, 3-4 TWO_BALANCED, 2-3 PHOTO_PLUS_QUOTE, 1-2 FOUR_GRID or THREE_GRID, 1-2 QUOTE_PAGE, 1 COLLAGE_PLUS_LETTER.
- Follow pacing: no more than 2 dense layouts in a row.

TEXT QUALITY RULES:
- NEVER use raw image descriptions as body text.
- Use the couple's names and nicknames throughout.
- body_text = warm narrative paragraph, NOT photo description.
- caption_text = SHORT poetic phrase (8-15 words).
- quote_text = AI-GENERATED quote matching the vibe — personal to this couple.
- heading_text = evocative chapter/section title (3-6 words).

IMPORTANT REMINDERS:
- MUST generate at least {min_chapters} chapters.
- Use ALL {num_photos} photos at least once.
- chapter_index and spread_index MUST be 0-based integers.
- Each chapter blurb must be UNIQUE.
- Follow PACING RULES and SCORING RULES.
{self._build_language_instruction(request.locale)}"""

    # ── Questions prompt ─────────────────────────────────────────────────

    _LOCALE_TO_LANGUAGE = {
        "en": "English", "ar": "Arabic", "fr": "French", "es": "Spanish",
        "de": "German", "tr": "Turkish", "ja": "Japanese", "ko": "Korean",
        "zh": "Chinese", "hi": "Hindi", "pt": "Portuguese", "it": "Italian",
        "ru": "Russian",
    }

    def build_questions_prompt(
        self,
        photo_analyses: list[dict],
        partner_names: list[str],
        relationship_type: str,
        locale: str = "en",
    ) -> str:
        names, _ = self._format_names(partner_names)
        if not names:
            names = "the couple"
        analyses_text = "\n".join(
            f"Photo {a.get('photo_index', i)}: {a.get('description', '')} | Tags: {a.get('tags', [])}"
            for i, a in enumerate(photo_analyses)
        )

        language_name = self._LOCALE_TO_LANGUAGE.get(locale, "English")
        language_instruction = ""
        if language_name != "English":
            language_instruction = f"""
LANGUAGE: You MUST generate ALL question_text and context_hint values in {language_name}.
Do NOT translate proper nouns or names.
"""

        return f"""You are a storyteller helping create a deeply personal memory book for {names} ({relationship_type}).

You have {len(photo_analyses)} analyzed photos. Your job: ask exactly 5-7 questions whose answers will unlock the REAL story behind these photos — the kind of details that turn a generic photo book into something that makes the reader cry happy tears.

Analyzed photos:
{analyses_text}

QUESTION STRATEGY (pick 5-7 total, one from each category that applies):

1. THE ORIGIN STORY — Ask about how they met or a defining early moment.
   Example: "What's the story of how you two first met? What's one detail from that day you'll never forget?"

2. THE PHOTO WITH A SECRET — Pick the most interesting/emotional photo and ask what's happening beyond the frame.
   Example: "Photo 5 looks like a special celebration — what were you feeling right before this was taken?"

3. THE INSIDE JOKE — Every couple has one.
   Example: "What's an inside joke between you two that would make no sense to anyone else?"

4. THE TURNING POINT — Ask about a moment that deepened the relationship.
   Example: "Was there a specific moment when you realized this was something truly special?"

5. THE SENSORY DETAIL — Ask for a small, vivid detail that brings a scene to life.
   Example: "I see a cozy dinner scene in photo 8 — do you remember what song was playing?"

6. THE FUTURE WISH — Something forward-looking for a perfect closing page.
   Example: "If you could relive one moment from your time together, which would it be?"

7. THE UNSEEN MOMENT — Ask about something NOT in the photos.
   Example: "Is there an important moment that isn't captured in any of these photos?"

RULES:
- Generate EXACTLY 5 to 7 questions, no more
- Reference specific photos by number when relevant
- Questions must feel like a warm conversation, not an interview
- Each question needs a context_hint

Respond ONLY with valid JSON array:
[
  {{
    "question_id": "q1",
    "question_text": "...",
    "context_hint": "This becomes the opening narrative...",
    "related_photo_indices": []
  }}
]
{language_instruction}"""

    # ── Text regeneration ────────────────────────────────────────────────

    def build_regenerate_text_prompt(self, request: RegenerateTextRequest) -> str:
        anti_cringe = self._compose_section("anti_cringe_rules")
        return f"""You are editing a single text field in a memory book.

Field: {request.field_name}
Current text: "{request.current_text}"
User instruction: "{request.instruction}"
Context: {request.context or "A spread in a couples memory book."}

{anti_cringe}

Rewrite the text following the user's instruction. Return ONLY the new text, nothing else — no quotes, no explanation, no JSON wrapping.
"""

    # ── Image generation ─────────────────────────────────────────────────

    def build_image_generation_prompt(
        self,
        user_prompt: str,
        style_hint: str,
        image_look: str,
    ) -> str:
        look_instruction = IMAGE_LOOK_PROMPTS.get(image_look, "")
        parts = [
            "Generate an image for a couples memory book.",
            f"Description: {user_prompt}.",
        ]
        if style_hint:
            parts.append(f"Style: {style_hint}.")
        if look_instruction:
            parts.append(f"Look: {look_instruction}")
        parts.append("The image should be emotionally resonant, high quality, and suitable for print.")
        return " ".join(parts)
