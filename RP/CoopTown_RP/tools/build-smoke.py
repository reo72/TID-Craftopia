"""Builds the cook's smoker pictures; tools/build-smoke-ui.mjs lays them out in ui/cooptown_smoke.json.

The sources (tools/assets/smoke/, one large picture per part with uneven margins and a faint glow) are cut to their
solid part and scaled down. The background keeps its whole picture (1672 x 941). The gauge is the empty 8-cell bar;
one glowing cell is laid into each of its cells (cell places: build-smoke-ui.mjs GAUGE, measured on track.png).
Writes textures/cooptown/smoke/.

Run from the CoopTown_RP folder:  python tools/build-smoke.py
"""
import os
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "smoke")
OUT = os.path.join(RP, "textures", "cooptown", "smoke")
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
    Image.open(os.path.join(SRC, "smoker_background.png")).convert("RGBA").save(os.path.join(OUT, "background.png"))
    for name, out, width in [("recipe_normal", "recipe", 256), ("recipe_selected", "recipe_on", 256), ("iron_button", "button", 512), ("amber_button", "button_on", 512),
                             ("smoke_action_button", "action", 512), ("detail_panel", "panel", 512), ("ingredient_row", "row", 512), ("progress_track", "track", 512),
                             ("progress_cell", "cell", 64), ("smoker_decoration", "smoker", 256), ("copper_square_button", "square", 128),
                             ("nav_left", "nav_left", 64), ("nav_right", "nav_right", 64), ("close_icon", "close", 96)]:
        save(load(name), out, width)
    print("smoke pictures:", sorted(os.listdir(OUT)))

if __name__ == "__main__":
    main()
