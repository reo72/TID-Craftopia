"""Builds the alchemist's experiment cauldron pictures; tools/build-cauldron-ui.mjs lays them out in
ui/cooptown_cauldron.json. The recipe scroll picture is also the cooptown:recipe_scroll item's icon
(textures/item_texture.json "cooptown_recipe_scroll").

The sources (tools/assets/cauldron/, one large picture per part with uneven margins and a faint glow) are cut to their
solid part and scaled down. The background keeps its whole picture (1672 x 941).
Writes textures/cooptown/cauldron/.

Run from the CoopTown_RP folder:  python tools/build-cauldron.py
"""
import os
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "cauldron")
OUT = os.path.join(RP, "textures", "cooptown", "cauldron")
SOLID = 100  # alpha above this counts as the picture

def load(name):
    img = Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
    return img.crop(img.getchannel("A").point(lambda a: 255 if a > SOLID else 0).getbbox())

def save(img, name, width):
    """Scaled to width (aspect kept)."""
    h = max(1, round(img.height * width / img.width))
    img.resize((width, h), Image.LANCZOS).save(os.path.join(OUT, name + ".png"))

def square(img, size):
    """img centred on a clear square (an item icon)."""
    k = size / max(img.size)
    s = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)
    out = Image.new("RGBA", (size, size))
    out.paste(s, ((size - s.width) // 2, (size - s.height) // 2))
    return out

def main():
    os.makedirs(OUT, exist_ok=True)
    Image.open(os.path.join(SRC, "cauldron_background.png")).convert("RGBA").save(os.path.join(OUT, "background.png"))
    for name, out, width in [("ingredient_slot_normal", "slot", 160), ("ingredient_slot_selected", "slot_on", 160), ("result_panel", "result", 384),
                             ("experiment_button", "experiment", 512), ("receive_button", "receive", 512), ("success_badge", "success", 384), ("failure_badge", "failure", 384),
                             ("cauldron_decoration", "cauldron", 384), ("progress_track", "track", 512), ("progress_fill", "fill", 512), ("back_button", "back", 384),
                             ("nav_left", "nav_left", 64), ("nav_right", "nav_right", 64), ("close_icon", "close", 96), ("workflow_arrow", "arrow", 96)]:
        save(load(name), out, width)
    square(load("recipe_scroll_icon"), 64).save(os.path.join(OUT, "scroll.png"))
    print("cauldron pictures:", sorted(os.listdir(OUT)))

if __name__ == "__main__":
    main()
