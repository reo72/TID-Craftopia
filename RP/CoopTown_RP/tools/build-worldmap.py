"""Builds the world map pictures; tools/build-worldmap-ui.mjs lays them out in ui/cooptown_worldmap.json.

The sources (tools/assets/worldmap/, one large picture per part with transparent margins) are cut to their solid part
and scaled down. The selected tab has no picture of its own yet: it is the normal tab, brightened (a stand-in).
Writes textures/cooptown/worldmap/.

Run from the CoopTown_RP folder:  python tools/build-worldmap.py
"""
import os
from PIL import Image, ImageEnhance

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "worldmap")
OUT = os.path.join(RP, "textures", "cooptown", "worldmap")
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
    for name, out, width in [("map_viewport", "viewport", 1024), ("sidebar_panel", "sidebar", 384), ("header_strip", "header", 1024),
                             ("tab_normal", "tab", 384), ("button_primary", "button", 512), ("button_close", "close", 96), ("button_help", "help", 96),
                             ("button_minus", "minus", 96), ("button_plus", "plus", 96), ("checkbox_on", "check_on", 64), ("checkbox_off", "check_off", 64),
                             ("icon_house", "house", 96), ("icon_quest", "quest", 96), ("icon_flag", "flag", 96), ("icon_player", "player", 96), ("icon_map", "map", 128)]:
        save(load(name), out, width)
    tab = load("tab_normal")
    save(ImageEnhance.Brightness(tab).enhance(1.35), "tab_on", 384)  # stand-in for the missing tab_selected
    print("worldmap pictures:", sorted(os.listdir(OUT)))

if __name__ == "__main__":
    main()
