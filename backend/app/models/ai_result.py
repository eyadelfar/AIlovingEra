from dataclasses import dataclass, field


@dataclass
class AIServiceResult:
    """Structured result from any AI service call."""
    text: str
    images: list[bytes] = field(default_factory=list)
    image_mime_types: list[str] = field(default_factory=list)
