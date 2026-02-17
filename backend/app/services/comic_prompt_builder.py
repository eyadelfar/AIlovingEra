from app.interfaces.prompt_builder import AbstractPromptBuilder


class ComicPromptBuilder(AbstractPromptBuilder):
    """Builds the Stage 1 script-generation prompt — single responsibility."""

    def build(self, user_text: str, num_images: int, panels_per_page: int = 4) -> str:
        user_hint = f'\nUser\'s story hint: "{user_text}"' if user_text.strip() else ""
        return f"""
You are a master comic book writer and visual storyteller. You have been given {num_images} photographs.{user_hint}

Your task:

STEP 1 — ANALYZE each photograph carefully (numbered 0 to {num_images - 1}):
- Who/what is in it? Describe people (appearance, emotion, clothing), objects, setting
- What is the emotional tone?
- What story moment does this capture?

STEP 2 — STORY ORDER: Arrange ALL {num_images} photographs in the most compelling narrative sequence.
Think like a film director: establish setting → introduce characters → build tension → climax → resolution.
Every photo must appear exactly once.

STEP 3 — CREATE a professional comic book with:
- A catchy, memorable title
- A clear genre (action/romance/comedy/drama/mystery/sci-fi/fantasy/slice-of-life)
- An art style that fits the story (superhero/manga/noir/watercolor/indie)
- {panels_per_page} panels per page

STEP 4 — For each panel write:
- image_index: which photo (0-based) to transform into comic art
- shot_type: close-up / medium / wide / overhead / dutch-angle (choose for dramatic effect)
- layout: standard / wide / full / quarter (standard for most, wide for establishing shots, full for splashes)
- description: detailed visual description of what the comic panel should show
- dialogue: character speech as "CHARACTER NAME: text" or ""
- thought_bubble: character internal thought or ""
- caption: narrator box text (e.g. "Three days later…") or ""
- sfx: sound effect in ALL CAPS (e.g. "BOOM!", "CRASH!", "click") or ""
- mood: one word emotional tone (tense/joyful/mysterious/melancholic/excited/etc.)

CRITICAL RULES:
- Be creative and cinematic — give characters names based on their appearance
- Make dialogue feel natural and character-specific
- Use SFX sparingly but effectively for impact moments
- Captions should read like a published comic (not generic descriptions)
- image_index must be valid (0 to {num_images - 1}) and each index used at most once

Respond ONLY with valid JSON, no markdown fences, no prose:
{{
  "title": "Comic Book Title",
  "genre": "drama",
  "art_style": "noir",
  "pages": [
    {{
      "page_number": 1,
      "panels": [
        {{
          "panel_number": 1,
          "image_index": 2,
          "shot_type": "wide",
          "layout": "standard",
          "description": "Detailed visual description of what this panel shows",
          "dialogue": "ALEX: \\"We need to move. Now.\\"",
          "thought_bubble": "",
          "caption": "Somewhere in the city...",
          "sfx": "",
          "mood": "tense"
        }}
      ]
    }}
  ]
}}
"""
