"""Builds the survival inventory pictures (tools/build-inventory-ui.mjs lays them out in ui/inventory_screen.json).

The sources (tools/assets/inventory/, one picture per part, large and with uneven margins) are cut to their solid
part (a faint glow around each is left out) and scaled down. Pictures drawn at more than one size are nine-sliced
here (the corners keep their size, the edges and middle stretch), so the borders stay as thick as the panel's.
Every picture is K times its size on screen (in UI pixels), so it stays sharp at the larger UI scales.
Writes textures/cooptown/inventory/.

Run from the CoopTown_RP folder:  python tools/build-inventory.py
"""
import json, os
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "inventory")
OUT = os.path.join(RP, "textures", "cooptown", "inventory")
K = 4                  # picture pixels per UI pixel
PANEL = (196, 190)     # the inventory panel (build-inventory-ui.mjs P.w / P.h)
ART = 0.44             # source pixels -> picture pixels for the frames (the leather border ends up ~5.5 UI px)

SOLID = 100           # alpha above this counts as the picture (asset_dimensions.json's boxes include the faint glow)

def load(name):
    img = Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
    return img.crop(img.getchannel("A").point(lambda a: 255 if a > SOLID else 0).getbbox())

def nine(img, cs, size, co):
    """Nine-slice img: corners cs source px -> co px, edges and middle stretched to fill size."""
    w, h = img.size
    W, H = size
    out = Image.new("RGBA", size)
    xs, ys = [0, cs, w - cs, w], [0, cs, h - cs, h]
    Xs, Ys = [0, co, W - co, W], [0, co, H - co, H]
    for i in range(3):
        for j in range(3):
            part = img.crop((xs[i], ys[j], xs[i + 1], ys[j + 1]))
            out.paste(part.resize((Xs[i + 1] - Xs[i], Ys[j + 1] - Ys[j]), Image.LANCZOS), (Xs[i], Ys[j]))
    return out

def fit(img, size):
    """img scaled to fit size (aspect kept), centred on a clear picture."""
    k = min(size[0] / img.width, size[1] / img.height)
    s = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)
    out = Image.new("RGBA", size)
    out.paste(s, ((size[0] - s.width) // 2, (size[1] - s.height) // 2))
    return out

def save(img, name, nineslice=None):
    img.save(os.path.join(OUT, name + ".png"))
    if nineslice:  # base_size: the picture's size in UI pixels; the slice is counted in those
        json.dump({"nineslice_size": nineslice, "base_size": [img.width // K, img.height // K]},
                  open(os.path.join(OUT, name + ".json"), "w"))

def main():
    os.makedirs(OUT, exist_ok=True)
    bg = load("inventory_background")
    # the panel: whole corners (with the sprigs) kept at the frame scale
    save(nine(bg, 200, (PANEL[0] * K, PANEL[1] * K), round(200 * ART)), "panel")
    # the tab strip and the help sheet: the border only (the sprigs start ~62 source px in), nine-sliced in game
    save(nine(bg, 58, (26 * K, 26 * K), 6 * K), "frame", 6)
    # tabs: nine-sliced in game too (the help / close box is wider than the tabs)
    save(nine(load("tab_normal"), 150, (24 * K, 24 * K), 6 * K), "tab", 6)
    save(nine(load("tab_selected"), 150, (24 * K, 24 * K), 6 * K), "tab_on", 6)
    save(load("slot_empty").resize((18 * K, 18 * K), Image.LANCZOS), "slot")
    save(load("slot_selected").resize((18 * K, 18 * K), Image.LANCZOS), "slot_on")
    save(load("character_preview").resize((56 * K, 74 * K), Image.LANCZOS), "doll_frame")
    save(fit(load("craft_arrow"), (16 * K, 11 * K)), "arrow")
    for name, out in [("armor_helmet", "empty_helmet"), ("armor_chestplate", "empty_chest"), ("armor_leggings", "empty_legs"),
                      ("armor_boots", "empty_boots"), ("offhand_shield", "empty_shield"),
                      ("icon_recipes", "icon_recipes"), ("icon_chest", "icon_chest"), ("icon_help", "icon_help"), ("icon_close", "icon_close")]:
        save(fit(load(name), (16 * K, 16 * K)), out)
    print("inventory pictures:", sorted(os.listdir(OUT)))

if __name__ == "__main__":
    main()
