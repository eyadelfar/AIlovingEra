"""Download Google Fonts TTF files for PDF generation. Run during Docker build.

Uses raw.githubusercontent.com instead of fonts.google.com/download which
blocks automated requests with an HTML consent page.
"""
import os
import urllib.request

FONTS_DIR = os.path.join(os.path.dirname(__file__), "app", "fonts")
RAW_BASE = "https://raw.githubusercontent.com/google/fonts/main"

# (local_filename, github_path) pairs
# Variable fonts [wght] support all weights in a single file.
# Static fonts need separate files per weight.
FONT_FILES = [
    # Variable fonts (Regular through Bold+ in one file)
    ("PlayfairDisplay.ttf",       "ofl/playfairdisplay/PlayfairDisplay[wght].ttf"),
    ("PlayfairDisplay-Italic.ttf","ofl/playfairdisplay/PlayfairDisplay-Italic[wght].ttf"),
    ("Lora.ttf",                  "ofl/lora/Lora[wght].ttf"),
    ("DancingScript.ttf",         "ofl/dancingscript/DancingScript[wght].ttf"),
    ("CormorantGaramond.ttf",     "ofl/cormorantgaramond/CormorantGaramond[wght].ttf"),
    ("Montserrat.ttf",            "ofl/montserrat/Montserrat[wght].ttf"),
    ("LibreBaskerville.ttf",      "ofl/librebaskerville/LibreBaskerville[wght].ttf"),
    ("Nunito.ttf",                "ofl/nunito/Nunito[wght].ttf"),

    # Static fonts (single weight per file)
    ("AbrilFatface-Regular.ttf",  "ofl/abrilfatface/AbrilFatface-Regular.ttf"),
    ("OldStandard-Regular.ttf",   "ofl/oldstandardtt/OldStandard-Regular.ttf"),
    ("OldStandard-Bold.ttf",      "ofl/oldstandardtt/OldStandard-Bold.ttf"),
    ("SpecialElite-Regular.ttf",  "apache/specialelite/SpecialElite-Regular.ttf"),
    ("CrimsonText-Regular.ttf",   "ofl/crimsontext/CrimsonText-Regular.ttf"),
    ("CrimsonText-Bold.ttf",      "ofl/crimsontext/CrimsonText-Bold.ttf"),
    ("ComicNeue-Regular.ttf",     "ofl/comicneue/ComicNeue-Regular.ttf"),
    ("ComicNeue-Bold.ttf",        "ofl/comicneue/ComicNeue-Bold.ttf"),
]


def download_fonts():
    os.makedirs(FONTS_DIR, exist_ok=True)
    ok, fail = 0, 0

    for local_name, gh_path in FONT_FILES:
        dest = os.path.join(FONTS_DIR, local_name)
        if os.path.exists(dest):
            print(f"  Exists: {local_name}")
            ok += 1
            continue

        # URL-encode brackets for variable fonts
        url = f"{RAW_BASE}/{gh_path}".replace("[", "%5B").replace("]", "%5D")
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (compatible; font-downloader)"
            })
            resp = urllib.request.urlopen(req, timeout=30)
            data = resp.read()

            if len(data) < 1000:
                print(f"  Warning: {local_name} too small ({len(data)} bytes), skipping")
                fail += 1
                continue

            with open(dest, "wb") as f:
                f.write(data)
            print(f"  Downloaded: {local_name} ({len(data):,} bytes)")
            ok += 1
        except Exception as e:
            print(f"  Warning: Could not download {local_name}: {e}")
            fail += 1

    print(f"\nFonts: {ok} downloaded, {fail} failed")


if __name__ == "__main__":
    download_fonts()
