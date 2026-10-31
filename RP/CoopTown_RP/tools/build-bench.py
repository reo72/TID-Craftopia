"""Builds the crafting table (job workbench) pictures; tools/build-bench-ui.mjs lays them out in ui/cooptown_bench.json.

The sources (tools/assets/bench2/, one large picture per part with uneven margins and a faint glow) are cut to their
solid part and scaled down. The background keeps its full frame (1672 x 941, the same frame as the reference image
crafting_table_preview.png, which the layout is measured from).
Writes textures/cooptown/bench/.

Run from the CoopTown_RP folder:  python tools/build-bench.py
"""
import os
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "bench2")
OUT = os.path.join(RP, "textures", "cooptown", "bench")
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
    Image.open(os.path.join(SRC, "workbench_background.png")).convert("RGBA").save(os.path.join(OUT, "background.png"))
    for name, out, width in [("recipe_normal", "recipe", 384), ("recipe_selected", "recipe_on", 384),
                             ("wood_button_normal", "button", 512), ("wood_button_selected", "button_on", 512),
                             ("wood_square_button", "square", 128), ("craft_slot", "slot", 128), ("craft_arrow", "arrow", 128),
                             ("nav_left", "nav_left", 64), ("nav_right", "nav_right", 64), ("close_icon", "close", 96)]:
        save(load(name), out, width)
    print("bench pictures:", sorted(os.listdir(OUT)))

if __name__ == "__main__":
    main()
