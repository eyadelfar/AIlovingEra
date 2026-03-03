"""
Template style definitions — loaded from YAML, mirrors frontend TEMPLATE_STYLES.
This is the single source of truth for PDF rendering that matches the frontend preview.
"""

from app.prompts.yaml_loader import load_yaml

_data = load_yaml("template_styles.yaml")

TEMPLATE_STYLES = {k: v for k, v in _data.items() if k != "photo_filters"}
TEMPLATE_PHOTO_FILTERS = _data.get("photo_filters", {})
