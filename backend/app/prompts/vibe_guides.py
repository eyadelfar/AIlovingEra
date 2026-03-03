# Thin re-export: all data loaded from YAML
from app.prompts.yaml_loader import load_yaml

VIBE_GUIDES: dict[str, dict] = load_yaml("vibe_guides.yaml")
