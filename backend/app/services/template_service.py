import json
from pathlib import Path

_TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
_STRUCTURES_DIR = _TEMPLATES_DIR / "structures"

_cache: dict[str, dict] = {}
_structure_cache: dict[str, dict] = {}


# ── Design templates ─────────────────────────────────────────────────────

def _load_all() -> dict[str, dict]:
    if _cache:
        return _cache
    for path in _TEMPLATES_DIR.glob("*.json"):
        data = json.loads(path.read_text(encoding="utf-8"))
        _cache[data["slug"]] = data
    return _cache


def list_templates() -> list[dict]:
    templates = _load_all()
    return [
        {
            "slug": t["slug"],
            "name": t["name"],
            "description": t["description"],
            "preview_emoji": t.get("preview_emoji", ""),
            "ai_tone": t["ai_tone"],
        }
        for t in templates.values()
    ]


def get_template(slug: str) -> dict | None:
    return _load_all().get(slug)


# ── Structure templates ──────────────────────────────────────────────────

def _load_structures() -> dict[str, dict]:
    if _structure_cache:
        return _structure_cache
    if _STRUCTURES_DIR.is_dir():
        for path in _STRUCTURES_DIR.glob("*.json"):
            data = json.loads(path.read_text(encoding="utf-8"))
            _structure_cache[data["slug"]] = data
    return _structure_cache


def list_structure_templates() -> list[dict]:
    templates = _load_structures()
    return [
        {
            "slug": t["slug"],
            "name": t["name"],
            "description": t["description"],
            "preview_emoji": t.get("preview_emoji", ""),
            "best_with_vibes": t.get("best_with_vibes", []),
        }
        for t in templates.values()
    ]


def get_structure_template(slug: str) -> dict | None:
    return _load_structures().get(slug)
