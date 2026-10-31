"""Builds the blacksmith's anvil pictures; tools/build-anvil-ui.mjs lays them out in ui/cooptown_anvil.json.

The sources (tools/assets/anvil/, one large picture per part with uneven margins and a faint glow) are cut to their
solid part and scaled down. The background keeps its whole picture (1672 x 941). The durability bar pictures come
with their frame drawn in, so only their coloured middle is kept for the fill (FILLS; the frame is the track).
Writes textures/cooptown/anvil/.

Run from the CoopTown_RP folder:  python tools/build-anvil.py
"""
import os
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "anvil")
OUT = os.path.join(RP, "textures", "cooptown", "anvil")
SOLID = 100  # alpha above this counts as the picture
FILLS = {"durability_green": ("fill_green", (190, 362, 1795, 422)), "durability_yellow": ("fill_yellow", (180, 322, 1700, 405))}

def load(name):
    img = Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
    return img.crop(img.getchannel("A").point(lambda a: 255 if a > SOLID else 0).getbbox())

def save(img, name, width):
    """Scaled to width (aspect kept)."""
    h = max(1, round(img.height * width / img.width))
    img.resize((width, h), Image.LANCZOS).save(os.path.join(OUT, name + ".png"))

def main():
    os.makedirs(OUT, exist_ok=True)
    Image.open(os.path.join(SRC, "smith_background.png")).convert("RGBA").save(os.path.join(OUT, "background.png"))
    for name, out, width in [("amber_button", "button_on", 512), ("iron_button", "button", 512), ("equipment_normal", "slot", 160), ("equipment_selected", "slot_on", 160),
                             ("square_button", "square", 128), ("smith_cost_panel", "cost_panel", 512), ("durability_track", "track", 256),
                             ("repair_arrow", "arrow", 96), ("repair_plus", "plus", 64), ("nav_left", "nav_left", 64), ("nav_right", "nav_right", 64), ("close_icon", "close", 96)]:
        save(load(name), out, width)
    for name, (out, box) in FILLS.items():
        Image.open(os.path.join(SRC, name + ".png")).convert("RGBA").crop(box).resize((256, 10), Image.LANCZOS).save(os.path.join(OUT, out + ".png"))
    print("anvil pictures:", sorted(os.listdir(OUT)))

if __name__ == "__main__":
    main()
