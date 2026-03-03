from functools import lru_cache
from pathlib import Path

from app.prompts.yaml_loader import load_yaml

_PROMPTS_DIR = Path(__file__).resolve().parent


@lru_cache
def load_system_prompt() -> str:
    """Load and compose system prompt from YAML sections into a single text block."""
    data = load_yaml("system_prompt.yaml")

    sections = []

    sections.append("CORE PROMISE")
    sections.append(data.get("core_promise", "").strip())

    sections.append("\nPRIMARY OUTPUT")
    sections.append(data.get("primary_output", "").strip())

    sections.append("\nIMPORTANT BEHAVIOR RULES")
    for i, rule in enumerate(data.get("behavior_rules", []), 1):
        sections.append(f"{i}) {rule}")

    sections.append("\nPIPELINE OVERVIEW (must follow)")
    for stage_key in data.get("pipeline", {}).keys():
        stage = data["pipeline"][stage_key]
        sections.append(f"{stage_key.upper()}) {stage['name']}:")
        for step in stage.get("steps", []):
            sections.append(f"   - {step}")

    layout_palette = data.get("layout_palette", "")
    if layout_palette:
        sections.append("\nLAYOUT PALETTE (allowed page/spread templates)")
        sections.append(layout_palette.strip())

    pacing = data.get("pacing_rules", {})
    sections.append("\nPACING RULES (global rhythm)")
    sections.append(f"- No more than {pacing.get('max_consecutive_dense', 2)} dense pages/spreads in a row.")
    interval = pacing.get("breather_interval", [4, 6])
    sections.append(f"- Every {interval[0]}-{interval[1]} pages, insert a breather ({', '.join(pacing.get('breather_layouts', []))}).")
    if pacing.get("start_end_hero"):
        sections.append("- Start and end the book with strong hero spreads.")
    if pacing.get("chapter_bookend_hero"):
        sections.append("- Start and end each chapter with a hero or photo+quote spread.")

    scoring = data.get("scoring_rules", {})
    sections.append("\nSCORING RULES (choose layout per spread)")
    sections.append("Score(L,S) = weighted sum of:")
    for key, weight in scoring.get("weights", {}).items():
        sections.append(f"- {key} (weight: {weight})")
    if scoring.get("notes"):
        sections.append(scoring["notes"].strip())

    aspect_rules = data.get("aspect_ratio_rules", "")
    if aspect_rules:
        sections.append("\nASPECT RATIO / CROPPING RULES")
        sections.append(aspect_rules.strip())

    chrono_rules = data.get("chronology_rules", "")
    if chrono_rules:
        sections.append("\nCHRONOLOGY / ORDERING RULES")
        sections.append(chrono_rules.strip())

    sections.append("\nWRITING RULES (tone + anti-cringe)")
    sections.append(data.get("writing_rules", "").strip())

    sections.append("\nTEXT COMPONENTS TO GENERATE")
    for comp in data.get("text_components", []):
        sections.append(f"- {comp}")

    design_prompts = data.get("design_asset_prompts", "")
    if design_prompts:
        sections.append("\nDESIGN ASSET PROMPTS (optional; separate from real-photo truth)")
        sections.append(design_prompts.strip())

    sections.append("\nDYNAMIC PREVIEW / EDIT LOOP (behavior)")
    sections.append(data.get("edit_loop_behavior", "").strip())

    regen = data.get("regen_policy", {})
    sections.append("\nREGEN / COST CONTROL POLICY")
    sections.append(f"- free_remakes_limit: {regen.get('free_remakes_limit', 3)}")
    sections.append(regen.get("notes", ""))

    pref_learning = data.get("preference_learning", "")
    if pref_learning:
        sections.append("\nPREFERENCE LEARNING (like/dislike)")
        sections.append(pref_learning.strip())

    sections.append("\nFINAL CHECKLIST BEFORE OUTPUT")
    for item in data.get("final_checklist", []):
        sections.append(f"- {item}")

    return "\n".join(sections)
