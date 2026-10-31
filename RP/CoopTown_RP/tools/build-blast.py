"""Builds the blacksmith's blast furnace pictures; tools/build-blast-ui.mjs lays them out in ui/cooptown_blast.json.

The sources (tools/assets/blast/, one large picture per part with uneven margins and a faint glow) are cut to their
solid part and scaled down. The background keeps its whole picture (1672 x 941).
The first download of this set was cut off: parts still missing are taken from the other job screens' sets
(STAND_INS) until they are added to tools/assets/blast/ - run this again then.
Writes textures/cooptown/blast/.

Run from the CoopTown_RP folder:  python tools/build-blast.py
"""
import os
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(RP, "tools", "assets")
SRC = os.path.join(ASSETS, "blast")
OUT = os.path.join(RP, "textures", "cooptown", "blast")
SOLID = 100  # alpha above this counts as the picture
# missing part -> a look-alike from another set (folder, file)
STAND_INS = {"ore_slot_normal": ("anvil", "equipment_normal"), "ore_slot_selected": ("anvil", "equipment_selected"),
             "smelt_action_button": ("anvil", "amber_button"), "progress_track": ("cook", "progress_track"),
             "progress_fill": ("cook", "progress_fill"), "nav_right": ("bench2", "nav_right")}

def load(name):
    path = os.path.join(SRC, name + ".png")
    if not os.path.exists(path):
        folder, other = STAND_INS[name]
        print("stand-in for", name, "->", folder + "/" + other)
        path = os.path.join(ASSETS, folder, other + ".png")
    img = Image.open(path).convert("RGBA")
    return img.crop(img.getchannel("A").point(lambda a: 255 if a > SOLID else 0).getbbox())

def save(img, name, width):
    """Scaled to width (aspect kept)."""
    h = max(1, round(img.height * width / img.width))
    img.resize((width, h), Image.LANCZOS).save(os.path.join(OUT, name + ".png"))

def main():
    os.makedirs(OUT, exist_ok=True)
    Image.open(os.path.join(SRC, "blast_background.png")).convert("RGBA").save(os.path.join(OUT, "background.png"))
    for name, out, width in [("ore_slot_normal", "slot", 256), ("ore_slot_selected", "slot_on", 256), ("iron_button", "button", 512), ("amber_button", "button_on", 512),
                             ("smelt_action_button", "action", 512), ("item_header", "header", 512), ("material_fuel_panel", "panel", 512),
                             ("progress_track", "track", 512), ("progress_fill", "fill", 512), ("blast_furnace_icon", "furnace", 256), ("iron_square_button", "square", 128),
                             ("nav_left", "nav_left", 64), ("nav_right", "nav_right", 64), ("close_icon", "close", 96), ("craft_arrow", "arrow", 128)]:
        save(load(name), out, width)
    print("blast pictures:", sorted(os.listdir(OUT)))

if __name__ == "__main__":
    main()
