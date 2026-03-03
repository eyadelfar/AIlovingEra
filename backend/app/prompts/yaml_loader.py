"""Central YAML loader with LRU caching for all prompt/config data."""

from __future__ import annotations

import copy
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

_DATA_DIR = Path(__file__).resolve().parent / "data"

# Internal cache that stores the raw parsed data (never exposed directly)
_all_yaml_dir_cache: dict[str, Any] = {}


@lru_cache(maxsize=64)
def _load_yaml_raw(filename: str) -> dict[str, Any]:
    """Load a YAML file from the prompts/data/ directory (cached, internal)."""
    path = _DATA_DIR / filename
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data if isinstance(data, dict) else {"_root": data}


def load_yaml(filename: str) -> dict[str, Any]:
    """Load a YAML file, returning a deep copy to prevent cache mutation."""
    return copy.deepcopy(_load_yaml_raw(filename))


def load_yaml_section(filename: str, section: str) -> Any:
    """Load a specific top-level key from a YAML file (deep copied)."""
    data = _load_yaml_raw(filename)
    if section not in data:
        raise KeyError(f"Section '{section}' not found in {filename}")
    return copy.deepcopy(data[section])


def load_all_yaml_dir(subdir: str) -> dict[str, Any]:
    """Load all YAML files from a subdirectory, keyed by stem name (cached)."""
    if subdir in _all_yaml_dir_cache:
        return copy.deepcopy(_all_yaml_dir_cache[subdir])

    target = _DATA_DIR / subdir
    if not target.is_dir():
        return {}
    result: dict[str, Any] = {}
    for fpath in sorted(target.glob("*.yaml")):
        with open(fpath, encoding="utf-8") as f:
            result[fpath.stem] = yaml.safe_load(f)
    _all_yaml_dir_cache[subdir] = result
    return copy.deepcopy(result)


def reload() -> None:
    """Clear all caches — useful for dev hot-reload."""
    _load_yaml_raw.cache_clear()
    _all_yaml_dir_cache.clear()
    # Also clear load_system_prompt cache if it exists
    try:
        from app.prompts import load_system_prompt
        load_system_prompt.cache_clear()
    except (ImportError, AttributeError):
        pass
