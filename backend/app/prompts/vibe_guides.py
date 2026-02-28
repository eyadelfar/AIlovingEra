VIBE_GUIDES: dict[str, dict] = {
    "romantic_warm": {
        "writing_style": (
            "Write with warmth, tenderness, and heartfelt sincerity. "
            "Use vivid sensory details — light, touch, season cues. "
            "Embrace emotional moments without melodrama or over-sentimentality."
        ),
        "caption_range": (8, 18),
        "humor_level": 2,
        "density_preference": "balanced",
        "avoid": [
            "generic Hallmark cliches unless grounded by user details",
            "over-the-top melodrama",
            "therapy-speak",
        ],
    },
    "bittersweet_lovely": {
        "writing_style": (
            "Write with gentle melancholy blended with beauty and gratitude. "
            "Acknowledge the passage of time. The most beautiful things carry a "
            "tinge of bittersweetness. Still loving — never depressing."
        ),
        "caption_range": (8, 18),
        "humor_level": 1,
        "density_preference": "balanced",
        "avoid": [
            "forced sadness",
            "depressing or bleak language",
            "trauma dumping",
            "pity",
        ],
    },
    "playful_meme": {
        "writing_style": (
            "Write with humor, playfulness, and witty observations. "
            "Include inside-joke style commentary. Use modern internet-savvy language "
            "but keep it safe to gift. NEVER humiliating, NEVER punching down."
        ),
        "caption_range": (8, 18),
        "humor_level": 9,
        "density_preference": "dense",
        "avoid": [
            "cringe",
            "anything that could embarrass the recipient",
            "mean-spirited humor",
            "socially risky jokes",
        ],
    },
    "comic_illustrated": {
        "writing_style": (
            "Real moments reimagined with comic narration. Use narrator boxes, "
            "speech-bubble style captions, and sound effects sparingly. "
            "Think graphic novel memoir — NOT fictional plot."
        ),
        "caption_range": (8, 18),
        "humor_level": 6,
        "density_preference": "dense",
        "avoid": [
            "inventing fictional plots",
            "over-the-top comic violence",
            "mean-spirited humor",
        ],
    },
    "cinematic_poetic": {
        "writing_style": (
            "Write with lyrical beauty, metaphors, and flowing prose. "
            "Cinematic framing — describe moments like movie scenes. "
            "Allow longer captions (20-35 words) sparingly for key emotional beats."
        ),
        "caption_range": (10, 35),
        "humor_level": 1,
        "density_preference": "sparse",
        "avoid": [
            "purple prose without substance",
            "overwrought metaphors",
            "pretentiousness",
        ],
    },
    "minimal_luxury": {
        "writing_style": (
            "Write with refined sophistication, understated emotion, and graceful brevity. "
            "Let white space and imagery speak. Less is more. "
            "Every word must earn its place."
        ),
        "caption_range": (5, 12),
        "humor_level": 0,
        "density_preference": "sparse",
        "avoid": [
            "verbosity",
            "flowery language",
            "excessive adjectives",
            "filler words",
        ],
    },
}
