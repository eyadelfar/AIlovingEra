from pydantic import BaseModel


class ComicPanel(BaseModel):
    panel_number: int
    image_index: int          # 0-based index of which uploaded image to use
    comic_art_base64: str = "" # data-URI set after Stage 2 art generation
    layout: str = "standard"  # full / half / wide / quarter
    shot_type: str = "medium"
    description: str = ""     # visual description / alt text
    dialogue: str = ""        # "CHARACTER: spoken text" or ""
    thought_bubble: str = ""  # character internal thought
    caption: str = ""         # narrator caption box
    sfx: str = ""             # BOOM! CRASH! CLICK!
    mood: str = ""


class ComicPage(BaseModel):
    page_number: int
    panels: list[ComicPanel]


class ComicBook(BaseModel):
    title: str = "Untitled Comic"
    genre: str = "adventure"
    art_style: str = "superhero"
    pages: list[ComicPage]
