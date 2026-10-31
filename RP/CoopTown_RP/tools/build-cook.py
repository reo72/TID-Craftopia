"""Builds the campfire kitchen pictures; tools/build-cook-ui.mjs lays them out in ui/cooptown_cook.json.

The sources (tools/assets/cook/, one large picture per part with uneven margins and a faint glow) are cut to their
solid part and scaled down. The background keeps its full frame (1672 x 941, the same frame as the reference image
kitchen_preview.png, which the layout is measured from).
Writes textures/cooptown/cook/.

Run from the CoopTown_RP folder:  python tools/build-cook.py
"""
import os
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "cook")
OUT = os.path.join(RP, "textures", "cooptown", "cook")
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
    Image.open(os.path.join(SRC, "kitchen_background.png")).convert("RGBA").save(os.path.join(OUT, "background.png"))
    for name, out, width in [("recipe_normal", "recipe", 384), ("recipe_selected", "recipe_on", 384), ("tab_normal", "tab", 384), ("tab_selected", "tab_on", 384),
                             ("wood_button_normal", "button", 512), ("cook_button", "cook_button", 512), ("wood_square_button", "square", 128),
                             ("recipe_detail_panel", "detail", 512), ("ingredient_row", "row", 512), ("progress_track", "track", 512), ("progress_fill", "fill", 512),
                             ("nav_left", "nav_left", 64), ("nav_right", "nav_right", 64), ("close_icon", "close", 96)]:
        save(load(name), out, width)
    print("cook pictures:", sorted(os.listdir(OUT)))

if __name__ == "__main__":
    main()
