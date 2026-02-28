from enum import Enum

from pydantic import BaseModel


# ── Enums ────────────────────────────────────────────────────────────────

class ImageLook(str, Enum):
    natural = "natural"
    film = "film"
    vintage = "vintage"
    bright_airy = "bright_airy"
    moody = "moody"
    bw = "bw"
    comic_ink = "comic_ink"
    watercolor = "watercolor"


class ImageDensity(str, Enum):
    dense = "dense"
    balanced = "balanced"
    airy = "airy"


class PageSize(str, Enum):
    a4 = "a4"
    us_letter = "us_letter"
    square = "square"


class Vibe(str, Enum):
    romantic_warm = "romantic_warm"
    bittersweet_lovely = "bittersweet_lovely"
    playful_meme = "playful_meme"
    comic_illustrated = "comic_illustrated"
    cinematic_poetic = "cinematic_poetic"
    minimal_luxury = "minimal_luxury"


class StructureTemplate(str, Enum):
    classic_timeline = "classic_timeline"
    milestones = "milestones"
    trips_adventures = "trips_adventures"
    year_in_love = "year_in_love"
    first_message_to_now = "first_message_to_now"
    inside_jokes_quotes = "inside_jokes_quotes"
    letters_to_you = "letters_to_you"
    scrapbook_collage = "scrapbook_collage"
    comic_highlights = "comic_highlights"


class LayoutId(str, Enum):
    hero_fullbleed = "HERO_FULLBLEED"
    two_balanced = "TWO_BALANCED"
    three_grid = "THREE_GRID"
    four_grid = "FOUR_GRID"
    six_montage = "SIX_MONTAGE"
    wall_8_10 = "WALL_8_10"
    photo_plus_quote = "PHOTO_PLUS_QUOTE"
    collage_plus_letter = "COLLAGE_PLUS_LETTER"
    quote_page = "QUOTE_PAGE"
    dedication = "DEDICATION"
    toc_simple = "TOC_SIMPLE"


# Guards against unexpected AI responses returning legacy layout strings.
# Keep until we're confident no AI model returns these values.
LEGACY_LAYOUT_MAP: dict[str, str] = {
    "single-photo": "HERO_FULLBLEED",
    "two-photo": "TWO_BALANCED",
    "full-bleed": "HERO_FULLBLEED",
    "text-only": "QUOTE_PAGE",
}


def normalize_layout(raw: str) -> str:
    """Map legacy layout strings to current LayoutId values."""
    return LEGACY_LAYOUT_MAP.get(raw, raw)


# ── Small value objects ──────────────────────────────────────────────────

class CropBox(BaseModel):
    x: float = 0.0
    y: float = 0.0
    w: float = 1.0
    h: float = 1.0


class PhotoMetadata(BaseModel):
    photo_index: int
    original_filename: str = ""
    width: int = 0
    height: int = 0
    aspect_ratio: float = 1.0
    orientation: str = "landscape"
    exif_date: str | None = None
    date_confidence: float = 0.0


class PhotoCluster(BaseModel):
    cluster_id: str
    label_guess: str = "unknown"
    label_confidence: float = 0.0
    time_range: dict = {}
    image_ids: list[int] = []
    hero_candidates: list[int] = []
    cohesion_score: float = 0.0
    notes: str = ""


class RegenPolicy(BaseModel):
    free_remakes_remaining: int = 3
    estimated_credits_if_regen: dict = {}


class PageElement(BaseModel):
    type: str = "image"
    image_id: int | None = None
    crop_box: CropBox = CropBox()
    caption: str = ""
    caption_style: str = ""
    text: str = ""
    placement_hint: str = ""
    style: str = ""


class CoverOption(BaseModel):
    cover_id: str = ""
    cover_style: str = ""
    cover_art_prompt: str = ""
    typography_notes: str = ""
    title: str = ""
    subtitle: str = ""


class DesignInstructions(BaseModel):
    mood_words: list[str] = []
    typography: str = ""
    spacing: str = ""
    do_not_use: list[str] = []


class SystemNotes(BaseModel):
    hard_constraints_applied: list[str] = []
    soft_preferences_applied: list[str] = []
    known_uncertainties: list[str] = []
    suggested_next_actions: list[str] = []


class SmartQuestion(BaseModel):
    question_id: str = ""
    reason: str = ""
    question_text: str = ""
    answer_type: str = "single_choice"
    choices: list[str] = []
    applies_to: dict = {}


# ── Photo analysis ───────────────────────────────────────────────────────

class PhotoAnalysis(BaseModel):
    photo_index: int
    description: str = ""
    scene_type: str = ""
    emotion: str = ""
    people_count: int = 0
    tags: list[str] = []
    suggested_caption: str = ""
    story_relevance: str = ""
    cluster_id: int | None = None
    estimated_date_hint: str = ""
    hero_candidate: bool = False
    face_regions: list[CropBox] = []
    safe_crop_box: CropBox = CropBox()
    date_confidence: float = 0.0


# ── Page / spread / chapter ──────────────────────────────────────────────

class MemoryPageDraft(BaseModel):
    page_number: int
    page_type: str = "content"
    layout_type: str = "HERO_FULLBLEED"
    photo_indices: list[int] = []
    heading_text: str = ""
    body_text: str = ""
    caption_text: str = ""
    quote_text: str = ""
    page_side: str = ""  # "left", "right", or "" for full spread


class SpreadDraft(BaseModel):
    spread_index: int
    layout_type: str = "HERO_FULLBLEED"
    photo_indices: list[int] = []
    heading_text: str = ""
    body_text: str = ""
    caption_text: str = ""
    quote_text: str = ""
    image_look_override: str = ""
    ai_generated_image_prompt: str = ""
    elements: list[PageElement] = []
    assigned_clusters: list[str] = []
    design_notes: str = ""
    regen_policy: RegenPolicy | None = None


class ChapterDraft(BaseModel):
    chapter_index: int
    title: str = ""
    blurb: str = ""
    spreads: list[SpreadDraft] = []


class LongformTextBlock(BaseModel):
    block_index: int
    placement: str = "between_chapters"
    heading: str = ""
    body: str = ""


# ── Options / config ─────────────────────────────────────────────────────

class AddOns(BaseModel):
    love_letter_insert: bool = False
    audio_qr_codes: bool = False
    anniversary_edition_cover: bool = False
    mini_reel_storyboard: bool = False


class DesignScale(BaseModel):
    page_size: PageSize = PageSize.a4
    page_count_target: int = 0  # 0=auto, otherwise 1-200
    bleed_mm: float = 3.0
    margin_mm: float = 12.0


def calculate_page_count(num_photos: int, density: float = 1.2) -> int:
    """Auto-calculate target page count from photo count.

    density ~1.2 means each photo gets ~1.2 pages (some spreads have multiple).
    Adds overhead for cover, dedication, back cover, and chapter dividers.
    """
    base = max(8, int(num_photos * density))
    overhead = 4  # cover + dedication + closing + ToC
    return min(200, base + overhead)


# ── AI questions ─────────────────────────────────────────────────────────

class AIQuestion(BaseModel):
    question_id: str
    question_text: str
    context_hint: str = ""
    related_photo_indices: list[int] = []


class AIQuestionsResponse(BaseModel):
    questions: list[AIQuestion]


class AIQuestionAnswer(BaseModel):
    question_id: str
    answer_text: str


# ── Image generation ─────────────────────────────────────────────────────

class ImageGenerationRequest(BaseModel):
    prompt: str
    style_hint: str = ""
    image_look: ImageLook = ImageLook.natural


class ImageGenerationResponse(BaseModel):
    image_base64: str
    mime_type: str = "image/png"


# ── Text regeneration ────────────────────────────────────────────────────

class RegenerateTextRequest(BaseModel):
    chapter_index: int
    spread_index: int
    field_name: str
    current_text: str
    instruction: str
    context: str = ""


class RegenerateTextResponse(BaseModel):
    new_text: str


# ── Main draft ───────────────────────────────────────────────────────────

class MemoryBookDraft(BaseModel):
    title: str = "Our Memory Book"
    subtitle: str = ""
    dedication: str = ""
    overall_narrative: str = ""
    template_slug: str = "romantic"
    pages: list[MemoryPageDraft] = []
    chapters: list[ChapterDraft] = []
    longform_blocks: list[LongformTextBlock] = []
    love_letter_text: str = ""
    audio_qr_chapter_labels: list[str] = []
    anniversary_cover_text: str = ""
    mini_reel_frames: list[str] = []
    edit_suggestions: list[str] = []
    vibe: str = ""
    structure_template: str = ""
    title_options: list[dict] = []
    covers: list[CoverOption] = []
    closing_page: dict = {}
    clusters: list[PhotoCluster] = []
    questions_for_user: list[SmartQuestion] = []
    design_instructions: DesignInstructions | None = None
    notes_for_system: SystemNotes | None = None
    confidence: dict = {}


# ── Request / response ───────────────────────────────────────────────────

class BookGenerationRequest(BaseModel):
    template_slug: str = "romantic"
    structure_template: str = "classic_timeline"
    user_story_text: str = ""
    partner_names: list[str] = []
    relationship_type: str = "couple"
    special_occasion: str = ""
    vibe: str = "romantic_warm"
    image_look: ImageLook = ImageLook.natural
    image_density: ImageDensity = ImageDensity.balanced
    design_scale: DesignScale = DesignScale()
    add_ons: AddOns = AddOns()
    question_answers: list[AIQuestionAnswer] = []
    constraints: list[str] = []


class BookGenerationResponse(BaseModel):
    draft: MemoryBookDraft
    photo_analyses: list[PhotoAnalysis]
    estimated_pages: int
