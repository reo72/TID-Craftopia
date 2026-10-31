"""Builds the rune workshop pictures (刻印の工房); tools/build-rune-ui.mjs lays them out in ui/cooptown_rune.json.

The sources (tools/assets/rune/, one large picture per part with transparent margins) are cut to their solid part and
scaled down; the main frame keeps its whole picture (1672 x 941, the size of the design).
Writes textures/cooptown/rune/.

Run from the CoopTown_RP folder:  python tools/build-rune.py
"""
import os
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "rune")
OUT = os.path.join(RP, "textures", "cooptown", "rune")
SOLID = 100

def load(name):
    img = Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
    return img.crop(img.getchannel("A").point(lambda a: 255 if a > SOLID else 0).getbbox())

def save(img, name, width):
    h = max(1, round(img.height * width / img.width))
    img.resize((width, h), Image.LANCZOS).save(os.path.join(OUT, name + ".png"))

def main():
    os.makedirs(OUT, exist_ok=True)
    Image.open(os.path.join(SRC, "frame_main.png")).convert("RGBA").save(os.path.join(OUT, "frame.png"))
    for name, out, width in [("header_bar", "header", 1024), ("panel_editor", "panel_editor", 512), ("panel_standard", "panel", 512),
                             ("button_normal", "button", 512), ("button_selected", "button_on", 512), ("button_disabled", "button_off", 512),
                             ("button_close", "close", 96), ("gauge_track", "gauge", 512), ("gauge_fill", "gauge_fill", 512),
                             ("slot_equipment", "slot", 160), ("status_success", "status_ok", 512)] + \
                            [("icon_" + n, n, 96) for n in ["anvil", "back", "book_enchanted", "book_plain", "check", "crystal", "document",
                                                             "explosion", "flame", "lapis", "play", "save", "scroll", "sword"]]:
        save(load(name), out, width)
    print("rune pictures:", sorted(os.listdir(OUT)))

if __name__ == "__main__":
    main()
