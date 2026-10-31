"""Builds the enchanter's bookshelf pictures; tools/build-shelf-ui.mjs lays them out in ui/cooptown_shelf.json.

The sources (tools/assets/shelf/, one large picture per part with uneven margins and a faint glow) are cut to their
solid part and scaled down. The background keeps its whole picture (1672 x 941).
Writes textures/cooptown/shelf/.

Run from the CoopTown_RP folder:  python tools/build-shelf.py
"""
import os
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "shelf")
OUT = os.path.join(RP, "textures", "cooptown", "shelf")
SOLID = 100  # alpha above this counts as the picture

def load(name):
    img = Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
    return img.crop(img.getchannel("A").point(lambda a: 255 if a > SOLID else 0).getbbox())

def save(img, name, width):
    """Scaled to width (aspect kept)."""
    h = max(1, round(img.height * width / img.width))
    img.resize((width, h), Image.LANCZOS).save(os.path.join(OUT, name + ".png"))

def main():
    os.makedirs(OUT, exist_ok=True)
    Image.open(os.path.join(SRC, "bookshelf_background.png")).convert("RGBA").save(os.path.join(OUT, "background.png"))
    for name, out, width in [("storage_slot", "slot", 160), ("storage_selected", "slot_on", 160), ("locked_slot", "locked", 160), ("enchanted_book_icon", "book", 128),
                             ("lock_icon", "lock", 64), ("parchment_panel", "parchment", 512), ("purple_button", "button_on", 512), ("oak_button", "button", 512),
                             ("status_badge", "badge", 512), ("progress_track", "track", 512), ("progress_fill", "fill", 512), ("wood_square_button", "square", 128),
                             ("close_icon", "close", 96)]:
        save(load(name), out, width)
    print("shelf pictures:", sorted(os.listdir(OUT)))

if __name__ == "__main__":
    main()
