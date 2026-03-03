# Thin re-export: all data loaded from YAML
from app.prompts.yaml_loader import load_yaml

STRUCTURE_GUIDES: dict[str, dict] = load_yaml("structure_guides.yaml")
