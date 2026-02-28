from functools import lru_cache
from pathlib import Path

_PROMPTS_DIR = Path(__file__).resolve().parent


@lru_cache
def load_system_prompt() -> str:
    return (_PROMPTS_DIR / "system_prompt.txt").read_text(encoding="utf-8")
