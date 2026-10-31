"""Builds the farmer's composter pictures; tools/build-compost-ui.mjs lays them out in ui/cooptown_compost.json.

The sources (tools/assets/compost/, one large picture per part with uneven margins and a faint glow) are cut to their
solid part and scaled down. The background keeps its whole picture (1672 x 941). The gauge is the empty 8-cell bar;
one green cell is laid into each of its cells (cell places: build-compost-ui.mjs GAUGE, measured on gauge.png).
Writes textures/cooptown/compost/.

Run from the CoopTown_RP folder:  python tools/build-compost.py
"""
import os
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "compost")
OUT = os.path.join(RP, "textures", "cooptown", "compost")
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
    Image.open(os.path.join(SRC, "composter_background.png")).convert("RGBA").save(os.path.join(OUT, "background.png"))
    for name, out, width in [("material_normal", "slot", 256), ("material_selected", "slot_on", 256), ("oak_button", "button", 512), ("green_button", "button_on", 512),
                             ("detail_panel", "panel", 512), ("compost_gauge_empty", "gauge", 512), ("compost_gauge_cell", "cell", 64), ("compost_icon", "compost", 160),
                             ("bone_meal_icon", "bone_meal", 96), ("wood_square_button", "square", 128), ("nav_left", "nav_left", 64), ("nav_right", "nav_right", 64), ("close_icon", "close", 96)]:
        save(load(name), out, width)
    print("compost pictures:", sorted(os.listdir(OUT)))

if __name__ == "__main__":
    main()
