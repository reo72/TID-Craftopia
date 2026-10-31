"""Builds the loading screen pictures; tools/build-loading-ui.mjs lays them out in ui/progress_screen.json.

The parts come from one sheet (tools/assets/loading/loading_ui_asset_sheet.png, transparent) cut at the boxes below.
The sheet has no background picture: the town picture is the top of the design (tools/assets/loading/design.png, the
1672 x 941 mock-up) above the bottom panel; the UI draws its own title, mode tag and hint over the same places.
Writes textures/cooptown/loading/.

Run from the CoopTown_RP folder:  python tools/build-loading.py
"""
import os
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "loading")
OUT = os.path.join(RP, "textures", "cooptown", "loading")
PARTS = {"panel": (57, 96, 1875, 234), "bar": (57, 300, 1875, 378), "fill": (66, 411, 1869, 459), "hint": (57, 495, 1461, 585),
         "mode": (1530, 498, 1872, 591), "cancel": (63, 627, 333, 714), "cancel_hover": (369, 624, 642, 714), "cancel_pressed": (675, 624, 942, 714),
         "grass": (984, 612, 1074, 732), "sprout": (1131, 654, 1182, 717), "book": (1233, 645, 1335, 726),
         "dot1": (1389, 666, 1416, 693), "dot2": (1449, 666, 1476, 693), "dot3": (1506, 666, 1533, 693), "title_bg": (1581, 639, 1869, 717)}

def main():
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.open(os.path.join(SRC, "loading_ui_asset_sheet.png")).convert("RGBA")
    for name, b in PARTS.items():
        part = sheet.crop(b); w = part.width
        width = 1024 if w > 1000 else 512 if w > 200 else 96
        part.resize((width, max(1, round(part.height * width / w))), Image.LANCZOS).save(os.path.join(OUT, name + ".png"))
    Image.open(os.path.join(SRC, "design.png")).convert("RGB").crop((0, 0, 1672, 705)).save(os.path.join(OUT, "background.png"))
    print("loading pictures:", sorted(os.listdir(OUT)))

if __name__ == "__main__":
    main()
