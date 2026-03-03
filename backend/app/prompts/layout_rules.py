# Thin re-export: all data loaded from YAML
from app.prompts.yaml_loader import load_yaml

_data = load_yaml("layout_rules.yaml")

# Pacing constants
MAX_CONSECUTIVE_DENSE = _data["pacing"]["max_consecutive_dense"]
BREATHER_INTERVAL_MIN = _data["pacing"]["breather_interval_min"]
BREATHER_INTERVAL_MAX = _data["pacing"]["breather_interval_max"]
BREATHER_LAYOUTS = set(_data["pacing"]["breather_layouts"])

# Convert photo_count lists back to tuples for backward compat
LAYOUT_PALETTE: dict[str, dict] = {}
for _name, _layout in _data["layouts"].items():
    _entry = dict(_layout)
    _entry["photo_count"] = tuple(_entry["photo_count"])
    LAYOUT_PALETTE[_name] = _entry
