import json

from app.interfaces.prompt_builder import AbstractPromptBuilder
from app.models.schemas import BookGenerationRequest, RegenerateTextRequest
from app.prompts import load_system_prompt
from app.prompts.layout_rules import LAYOUT_PALETTE
from app.prompts.structure_guides import STRUCTURE_GUIDES
from app.prompts.vibe_guides import VIBE_GUIDES
from app.constants import IMAGE_LOOK_PROMPTS


DENSITY_GUIDES = {
    "dense": {
        "photos_per_spread": "2-3 photos per spread on average",
        "preferred_layouts": "Favor FOUR_GRID, THREE_GRID, SIX_MONTAGE, TWO_BALANCED. Use HERO_FULLBLEED sparingly (only 1-2 hero shots).",
        "whitespace": "Minimize whitespace. Fill pages with content.",
    },
    "balanced": {
        "photos_per_spread": "1-2 photos per spread on average",
        "preferred_layouts": "Mix of HERO_FULLBLEED, TWO_BALANCED, PHOTO_PLUS_QUOTE, THREE_GRID. Good variety.",
        "whitespace": "Moderate whitespace. Let pages breathe between dense and sparse layouts.",
    },
    "airy": {
        "photos_per_spread": "1 photo per spread on average",
        "preferred_layouts": "Favor HERO_FULLBLEED, PHOTO_PLUS_QUOTE. Avoid SIX_MONTAGE and WALL_8_10. Use QUOTE_PAGE liberally as breathers.",
        "whitespace": "Generous whitespace. Every photo gets room to shine.",
    },
}


class MemoryBookPromptBuilder(AbstractPromptBuilder):
    """Builds prompts for the memory book pipeline."""

    # ── Stage B: Photo analysis + clustering ─────────────────────────────

    def build_photo_analysis_prompt(
        self,
        num_photos: int,
        metadata: list[dict] | None = None,
    ) -> str:
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
                lines.append(" | ".join(parts))
            meta_block = (
                "\n\nKNOWN METADATA (from EXIF / file info):\n"
                + "\n".join(lines)
                + "\nUse this to confirm or refine your date/time estimates. "
                "Prefer EXIF dates over visual guesses when available.\n"
            )

        return f"""You are an expert photo analyst for a personalized memory book service.
You have been given {num_photos} photographs from a couple or loved ones.

CRITICAL RULES:
- ONLY describe what you can ACTUALLY SEE. Do NOT hallucinate objects, animals, or details.
- If unsure about something, say "possibly" or omit it entirely. Never invent what isn't clearly visible.
- Look at ALL photos together BEFORE analyzing each one. Cross-reference people, locations, events.
- Example: if you see a ring photo + emotional couple photo, that's an engagement, not "what's happening here".
- Captions must be specific to what's actually visible in THIS photo, not generic romance phrases.

IMPORTANT: Before analyzing individual photos, study ALL photos as a collection.
Identify recurring people (the couple), recognize the story arc (dating → engagement → wedding),
and use this context for each photo. If you see a ring + emotional reaction, that's an engagement.

PHOTO ORDER: Photos are in roughly chronological order (index 0 = earliest).
When EXIF dates are missing, use photo index as a proxy for timeline position.
Earlier index = earlier in the timeline. Cluster and order accordingly.
{meta_block}
For EACH photograph (indexed 0 to {num_photos - 1}), analyze and return structured JSON.

For each photo provide:
- photo_index: the 0-based index
- description: detailed description of the scene, people, setting, objects (ONLY what you see)
- scene_type: a short descriptive label for the scene (e.g. "outdoor park", "restaurant dinner", "beach sunset", "engagement", "wedding ceremony" — use whatever fits best, don't limit yourself)
- emotion: the dominant emotion you observe (use any fitting word)
- people_count: number of people visible
- tags: 3-5 descriptive tags
- suggested_caption: a warm, personal caption for this photo (8-18 words) — specific to THIS photo's content
- story_relevance: how this photo fits into a love/memory story (1-2 sentences)
- cluster_id: group related photos together (same event/location/time) using integer IDs starting at 0
- estimated_date_hint: best guess of season/time-of-day from visual + EXIF cues, or empty string
- date_confidence: 0.0-1.0 confidence in the date estimate
- hero_candidate: true if this is a standout photo (great composition, emotion, lighting)
- face_regions: array of crop boxes {{x, y, w, h}} (0-1 normalized) for detected faces
- safe_crop_box: {{x, y, w, h}} (0-1 normalized) — the largest safe crop that preserves all faces/subjects

Also provide a "clusters" summary:
- cluster_id: integer
- label_guess: a descriptive label for this group of photos (e.g. "beach vacation", "engagement party", "daily life", "road trip" — use whatever fits best)
- label_confidence: 0.0-1.0
- time_range: {{start, end}} approximate date range or empty
- image_ids: array of photo_index values in this cluster
- hero_candidates: array of the best photo_index values in this cluster
- cohesion_score: 0.0-1.0 how visually/temporally coherent this cluster is

Respond ONLY with valid JSON, no markdown fences:
{{
  "photos": [
    {{
      "photo_index": 0,
      "description": "...",
      "scene_type": "outdoor",
      "emotion": "romantic",
      "people_count": 2,
      "tags": ["park", "autumn", "couple"],
      "suggested_caption": "Where it all began...",
      "story_relevance": "Opening scene showing where the couple first met.",
      "cluster_id": 0,
      "estimated_date_hint": "autumn afternoon",
      "date_confidence": 0.6,
      "hero_candidate": true,
      "face_regions": [{{"x": 0.3, "y": 0.1, "w": 0.4, "h": 0.5}}],
      "safe_crop_box": {{"x": 0.1, "y": 0.0, "w": 0.8, "h": 0.9}}
    }}
  ],
  "clusters": [
    {{
      "cluster_id": 0,
      "label_guess": "everyday",
      "label_confidence": 0.7,
      "time_range": {{"start": "autumn 2023", "end": "autumn 2023"}},
      "image_ids": [0, 1, 2],
      "hero_candidates": [0],
      "cohesion_score": 0.85
    }}
  ]
}}
"""

    # ── Stage D+E: Full book plan ────────────────────────────────────────

    def build_narrative_prompt(
        self,
        request: BookGenerationRequest,
        photo_analyses: list[dict],
        clusters: list[dict] | None = None,
        structure_guide: dict | None = None,
        template_config: dict | None = None,
    ) -> str:
        system_prompt = load_system_prompt()

        # Names
        names = " and ".join(request.partner_names) if request.partner_names else "the couple"

        # Vibe
        effective_vibe = request.vibe or "romantic_warm"
        vibe_guide = VIBE_GUIDES.get(effective_vibe, VIBE_GUIDES["romantic_warm"])

        # Structure
        effective_structure = request.structure_template or "classic_timeline"
        struct_guide = structure_guide or STRUCTURE_GUIDES.get(effective_structure, STRUCTURE_GUIDES["classic_timeline"])

        # Context fragments
        occasion_hint = f"\nSpecial occasion: {request.special_occasion}" if request.special_occasion else ""
        story_hint = f'\nTheir story in their own words: "{request.user_story_text}"' if request.user_story_text.strip() else ""

        # Question answers
        answers_hint = ""
        if request.question_answers:
            lines = [f"- Q({a.question_id}): {a.answer_text}" for a in request.question_answers if a.answer_text.strip()]
            if lines:
                answers_hint = "\n\nANSWERS FROM THE COUPLE (weave naturally into narrative):\n" + "\n".join(lines)

        # Constraints
        constraints_hint = ""
        if request.constraints:
            constraints_hint = "\n\nUSER CONSTRAINTS (parse as hard_constraints):\n" + "\n".join(f"- {c}" for c in request.constraints)

        # Add-ons
        addons_hint = self._build_addons_hint(request)

        # Photo analyses text
        num_photos = len(photo_analyses)
        analyses_text = "\n".join(
            f"Photo {a.get('photo_index', i)} "
            f"(cluster={a.get('cluster_id', '?')}, "
            f"date={a.get('estimated_date_hint', '?')}, "
            f"conf={a.get('date_confidence', 0)}, "
            f"hero={a.get('hero_candidate', False)}, "
            f"aspect={a.get('aspect_ratio', a.get('safe_crop_box', {}).get('w', '?'))}): "
            f"{a.get('description', '')} | "
            f"Emotion: {a.get('emotion', '')} | "
            f"Scene: {a.get('scene_type', '')} | "
            f"Tags: {a.get('tags', [])}"
            for i, a in enumerate(photo_analyses)
        )

        # Clusters text
        clusters_text = ""
        if clusters:
            clusters_text = "\n\nCLUSTERS (from photo analysis):\n" + json.dumps(clusters, indent=2)

        # Layout palette
        layout_text = "\n".join(
            f"- {lid}: {info['description']} (photos: {info['photo_count'][0]}-{info['photo_count'][1]}, density: {info['density_class']})"
            for lid, info in LAYOUT_PALETTE.items()
        )

        # Template design config
        template_hint = ""
        if template_config:
            ai_tone = template_config.get("ai_tone", "")
            ai_style = template_config.get("ai_style_prompt", "")
            quote_pool = template_config.get("quote_pool", [])
            font_cfg = template_config.get("font_config", {})
            tpl_name = template_config.get("name", "")

            parts = [f"\nTEMPLATE DESIGN: {tpl_name}"]
            if ai_tone:
                parts.append(f"- Narrative tone: {ai_tone} — match this mood in ALL text (headings, body, captions, quotes)")
            if ai_style:
                parts.append(f"- Visual style: {ai_style}")
            if font_cfg:
                heading_font = font_cfg.get("heading", "")
                body_font = font_cfg.get("body", "")
                if heading_font or body_font:
                    parts.append(f"- Fonts: heading={heading_font}, body={body_font} — keep text lengths appropriate for these typefaces")
            if quote_pool:
                quotes_sample = quote_pool[:6]
                parts.append(f"- Quote pool (adapt or draw inspiration from): {json.dumps(quotes_sample)}")
                parts.append("  Use these quotes where fitting, or create new ones in the SAME tone and style.")
            template_hint = "\n".join(parts)

        page_target = request.design_scale.page_count_target if request.design_scale else 24

        # Calculate minimum chapters
        typical_chapters = struct_guide.get("typical_chapters", [])
        min_chapters = max(3, min(len(typical_chapters) if typical_chapters else 5, num_photos // 3))

        return f"""{system_prompt}

--- SESSION CONTEXT ---

COUPLE: {names}{occasion_hint}{story_hint}{answers_hint}{constraints_hint}

SELECTED VIBE: {effective_vibe}
VIBE GUIDE:
- Writing style: {vibe_guide['writing_style']}
- Caption word range: {vibe_guide['caption_range'][0]}-{vibe_guide['caption_range'][1]} words
- Humor level: {vibe_guide['humor_level']}/10
- Density preference: {vibe_guide['density_preference']}
- Avoid: {', '.join(vibe_guide['avoid'])}

SELECTED STRUCTURE TEMPLATE: {effective_structure}
- Strategy: {struct_guide.get('chapter_strategy', 'chronological')}
- REQUIRED CHAPTERS (generate at least {min_chapters}): {json.dumps(typical_chapters)}
- Pacing: {struct_guide.get('pacing_hint', '')}

CHRONOLOGICAL RULE: Photos are provided in approximate chronological order by index.
Index 0 = earliest memory, index {num_photos - 1} = most recent.
RESPECT this order when building chapters. Earlier photos go in earlier chapters.
Do NOT place later-indexed photos (e.g., engagement/wedding) at the beginning.
If the structure template is "classic_timeline", chapters MUST follow chronological order.

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
      "blurb": "40-90 word summary — each chapter blurb must be UNIQUE and reflect the chapter's specific theme and photos",
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

OPTIONAL FIELDS (include if relevant):
- "longform_blocks": [{{ "block_index": 0, "placement": "between_chapters", "heading": "...", "body": "..." }}]
- "design_instructions": {{ "mood_words": [...], "typography": "...", "spacing": "...", "do_not_use": [...] }}
- "notes_for_system": {{ "hard_constraints_applied": [...], "known_uncertainties": [...] }}
- "questions_for_user": [{{ "question_id": "q1", "question_text": "...", "answer_type": "short_text" }}]

LAYOUT VARIETY IS CRITICAL:
- Do NOT use HERO_FULLBLEED for every spread. It makes the book feel like a slideshow, not a memory book.
- For {num_photos} photos, aim for roughly: 3-4 HERO_FULLBLEED, 3-4 TWO_BALANCED, 2-3 PHOTO_PLUS_QUOTE, 1-2 FOUR_GRID or THREE_GRID, 1-2 QUOTE_PAGE (breathers), 1 COLLAGE_PLUS_LETTER.
- Follow pacing: no more than 2 dense layouts in a row. Insert QUOTE_PAGE or HERO_FULLBLEED every 4-6 spreads as breathing room.
- Use HERO_FULLBLEED ONLY for standout hero photos (best 3-4 from the collection).
- Group multiple photos into TWO_BALANCED, THREE_GRID, FOUR_GRID where they belong to the same cluster/moment.

TEXT QUALITY RULES:
- NEVER use raw image descriptions as body text. Body text should be narrative — tell the STORY, not describe the photo.
- Use the couple's names ({names}) throughout the narrative, not "the couple" or "they".
- Connect moments across chapters — reference how earlier memories lead to later ones.
- body_text should be a warm 1-3 sentence narrative paragraph (NOT a photo description).
- caption_text should be a SHORT poetic/warm phrase (8-15 words), specific to the moment.
- quote_text should be an actual quote — either from the quote_pool or a fitting literary/famous quote.
- heading_text should be an evocative chapter/section title (3-6 words), never "Photo 1" or "Memory 3".
- ALL text fields must have actual content. Do NOT return null for text fields — use empty string "" if truly nothing fits.

IMPORTANT REMINDERS:
- MUST generate at least {min_chapters} chapters. Distribute photos across chapters.
- Each chapter should have 2-8 spreads. Do NOT put all spreads in one chapter.
- Use ALL {num_photos} photos at least once.
- chapter_index MUST be a 0-based integer (0, 1, 2, ...). Do NOT use strings like "ch1".
- spread_index MUST be a 0-based integer (0, 1, 2, ...). Do NOT use strings like "s1".
- layout_id must be one of the LAYOUT PALETTE IDs exactly.
- Each chapter blurb must be UNIQUE — reflect the chapter's specific photos, theme, and mood. Never reuse the same blurb.
- Earlier-indexed photos go in earlier chapters (chronological order).
- Follow PACING RULES and SCORING RULES from the system prompt.
- Do NOT invent facts. Use neutral phrasing for unknowns.
"""

    # ── Questions prompt ─────────────────────────────────────────────────

    def build_questions_prompt(
        self,
        photo_analyses: list[dict],
        partner_names: list[str],
        relationship_type: str,
    ) -> str:
        names = " and ".join(partner_names) if partner_names else "the couple"
        analyses_text = "\n".join(
            f"Photo {a.get('photo_index', i)}: {a.get('description', '')} | Tags: {a.get('tags', [])}"
            for i, a in enumerate(photo_analyses)
        )

        return f"""You are a storyteller helping create a deeply personal memory book for {names} ({relationship_type}).

You have {len(photo_analyses)} analyzed photos. Your job: ask exactly 5-7 questions whose answers will unlock the REAL story behind these photos — the kind of details that turn a generic photo book into something that makes the reader cry happy tears.

Analyzed photos:
{analyses_text}

QUESTION STRATEGY (pick 5-7 total, one from each category that applies):

1. THE ORIGIN STORY — Ask about how they met or a defining early moment. This becomes the emotional anchor.
   Example: "What's the story of how you two first met? What's one detail from that day you'll never forget?"

2. THE PHOTO WITH A SECRET — Pick the most interesting/emotional photo and ask what's happening beyond the frame.
   Example: "Photo 5 looks like a special celebration — what were you feeling right before this was taken?"

3. THE INSIDE JOKE — Every couple has one. This becomes the funniest page in the book.
   Example: "What's an inside joke between you two that would make no sense to anyone else?"

4. THE TURNING POINT — Ask about a moment that deepened the relationship.
   Example: "Was there a specific moment when you realized this was something truly special?"

5. THE SENSORY DETAIL — Ask for a small, vivid detail that brings a scene to life.
   Example: "I see a cozy dinner scene in photo 8 — do you remember what song was playing, or what the place smelled like?"

6. THE FUTURE WISH — Something forward-looking that makes a perfect closing page.
   Example: "If you could relive one moment from your time together, which would it be and why?"

7. THE UNSEEN MOMENT — Ask about something NOT in the photos that matters to their story.
   Example: "Is there an important moment in your relationship that isn't captured in any of these photos?"

RULES:
- Generate EXACTLY 5 to 7 questions, no more
- Reference specific photos by number when relevant
- Each answer should give you material for at least one paragraph of narrative
- Questions must feel like a warm conversation, not an interview
- Each question needs a context_hint that explains how the answer shapes the book
- DO NOT ask surface-level questions like "where was this taken" unless the location unlocks deeper meaning

Respond ONLY with valid JSON array, no markdown fences:
[
  {{
    "question_id": "q1",
    "question_text": "What's the story behind how you two met? Is there one tiny detail from that day you still think about?",
    "context_hint": "This becomes the opening narrative — the origin story that sets the tone for the entire book.",
    "related_photo_indices": []
  }}
]
"""

    # ── Text regeneration ────────────────────────────────────────────────

    def build_regenerate_text_prompt(self, request: RegenerateTextRequest) -> str:
        return f"""You are editing a single text field in a memory book.

Field: {request.field_name}
Current text: "{request.current_text}"
User instruction: "{request.instruction}"
Context: {request.context or "A spread in a couples memory book."}

NON-NEGOTIABLE QUALITY RULES:
- Specificity over cliche: avoid generic romance phrases unless grounded in user-provided details
- Respect uncertainty: if you don't know a fact (date/place), don't invent it
- Gift-ready voice: warm and human, not robotic; no therapy-speak; no cringe overkill
- Privacy posture: never reveal or infer sensitive details

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

    # ── Helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def _build_density_hint(request: BookGenerationRequest) -> str:
        density = request.image_density.value if request.image_density else "balanced"
        guide = DENSITY_GUIDES.get(density, DENSITY_GUIDES["balanced"])
        return (
            f"DENSITY GUIDE ({density}):\n"
            f"- Photos per spread: {guide['photos_per_spread']}\n"
            f"- Preferred layouts: {guide['preferred_layouts']}\n"
            f"- Whitespace: {guide['whitespace']}"
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
