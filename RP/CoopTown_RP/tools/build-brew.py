"""Builds the alchemist's brewing stand pictures; tools/build-brew-ui.mjs lays them out in ui/cooptown_brew.json.

The sources (tools/assets/brew/, one large picture per part with uneven margins and a faint glow) are cut to their
solid part and scaled down. The background keeps its whole picture (1672 x 941).
Writes textures/cooptown/brew/.

Run from the CoopTown_RP folder:  python tools/build-brew.py
"""
import os
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "brew")
OUT = os.path.join(RP, "textures", "cooptown", "brew")
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
    Image.open(os.path.join(SRC, "brewing_background.png")).convert("RGBA").save(os.path.join(OUT, "background.png"))
    for name, out, width in [("recipe_normal", "recipe", 256), ("recipe_selected", "recipe_on", 256), ("button_normal", "button", 512), ("button_selected", "button_on", 512),
                             ("brew_action_button", "action", 512), ("detail_panel", "panel", 512), ("ingredient_row", "row", 512), ("progress_track", "track", 512),
                             ("progress_fill", "fill", 512), ("brewing_stand_decoration", "stand", 256), ("stone_square_button", "square", 128),
                             ("nav_left", "nav_left", 64), ("nav_right", "nav_right", 64), ("close_icon", "close", 96)]:
        save(load(name), out, width)
    print("brew pictures:", sorted(os.listdir(OUT)))

if __name__ == "__main__":
    main()
