# Pacing constants
MAX_CONSECUTIVE_DENSE = 2
BREATHER_INTERVAL_MIN = 4
BREATHER_INTERVAL_MAX = 6
BREATHER_LAYOUTS = {"HERO_FULLBLEED", "QUOTE_PAGE", "TWO_BALANCED"}

LAYOUT_PALETTE: dict[str, dict] = {
    "HERO_FULLBLEED": {
        "photo_count": (1, 1),
        "caption_support": True,
        "longform_support": False,
        "density_class": "sparse",
        "description": "Single hero image, full bleed. Optional big caption.",
        "best_for": "standout photos, chapter openers/closers, panoramas",
    },
    "TWO_BALANCED": {
        "photo_count": (2, 2),
        "caption_support": True,
        "longform_support": False,
        "density_class": "sparse",
        "description": "Two images side-by-side with short captions.",
        "best_for": "paired moments, before/after, parallel scenes",
    },
    "THREE_GRID": {
        "photo_count": (3, 3),
        "caption_support": True,
        "longform_support": False,
        "density_class": "balanced",
        "description": "Three images in a grid with captions.",
        "best_for": "event sequences, small clusters",
    },
    "FOUR_GRID": {
        "photo_count": (4, 4),
        "caption_support": True,
        "longform_support": False,
        "density_class": "dense",
        "description": "Four images in a 2x2 grid with captions.",
        "best_for": "event coverage, group shots",
    },
    "SIX_MONTAGE": {
        "photo_count": (5, 6),
        "caption_support": False,
        "longform_support": False,
        "density_class": "dense",
        "description": "Five or six images in a montage layout. Minimal captions.",
        "best_for": "event overviews, travel montages",
    },
    "WALL_8_10": {
        "photo_count": (8, 10),
        "caption_support": False,
        "longform_support": False,
        "density_class": "dense",
        "description": "Eight to ten tiny images as a wall/collage. No long captions.",
        "best_for": "year-in-review montages, large event photo dumps",
    },
    "PHOTO_PLUS_QUOTE": {
        "photo_count": (1, 4),
        "caption_support": True,
        "longform_support": False,
        "density_class": "balanced",
        "description": "Left side: 2-4 images. Right side: large quote + optional hero image.",
        "best_for": "emotional beats, chapter transitions, milestone moments",
    },
    "COLLAGE_PLUS_LETTER": {
        "photo_count": (3, 9),
        "caption_support": False,
        "longform_support": True,
        "density_class": "balanced",
        "description": "Left side: photo collage (6-9 images). Right side: long text block.",
        "best_for": "letters, reflections, chapter closings",
    },
    "QUOTE_PAGE": {
        "photo_count": (0, 1),
        "caption_support": False,
        "longform_support": False,
        "density_class": "sparse",
        "description": "Large quote with optional tiny image accent. Breathing room.",
        "best_for": "pacing breathers, emotional pauses, transition pages",
    },
    "DEDICATION": {
        "photo_count": (0, 1),
        "caption_support": False,
        "longform_support": True,
        "density_class": "sparse",
        "description": "Dedication page with heartfelt message.",
        "best_for": "book opening, gift dedication",
    },
    "TOC_SIMPLE": {
        "photo_count": (0, 0),
        "caption_support": False,
        "longform_support": False,
        "density_class": "sparse",
        "description": "Optional table of contents listing chapters.",
        "best_for": "longer books (48+ pages) for navigation",
    },
}
