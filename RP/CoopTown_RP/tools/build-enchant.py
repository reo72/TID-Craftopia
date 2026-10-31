"""Builds the enchanting table pictures; tools/build-enchant-ui.mjs lays them out in ui/cooptown_enchant.json.

The sources (tools/assets/enchant/, one large picture per part with uneven margins and a faint glow) are cut to their
solid part and scaled down. The background keeps its whole picture (1536 x 1024, its soft glow included).
Writes textures/cooptown/enchant/.

Run from the CoopTown_RP folder:  python tools/build-enchant.py
"""
import os
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "enchant")
OUT = os.path.join(RP, "textures", "cooptown", "enchant")
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
    Image.open(os.path.join(SRC, "enchant_background.png")).convert("RGBA").save(os.path.join(OUT, "background.png"))
    for name, out, width in [("button_normal", "button", 512), ("button_selected", "button_on", 512), ("cost_panel", "cost_panel", 512),
                             ("item_header", "header", 512), ("equipment_normal", "slot", 160), ("equipment_selected", "slot_on", 160),
                             ("square_button", "square", 128), ("open_book_icon", "book", 128), ("lapis_icon", "lapis", 64),
                             ("nav_left", "nav_left", 64), ("nav_right", "nav_right", 64), ("close_icon", "close", 96)]:
        save(load(name), out, width)
    print("enchant pictures:", sorted(os.listdir(OUT)))

if __name__ == "__main__":
    main()
