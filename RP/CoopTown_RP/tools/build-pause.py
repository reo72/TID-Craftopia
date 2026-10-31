"""Builds the pause screen pictures; tools/build-pause-ui.mjs lays them out in ui/pause_screen.json.

The sources (tools/assets/pause/) are sheets: 01 frames and panels, 02 button states, 03 icons. The parts of 01 and 02
sit on a transparent sheet and are cut at the boxes below (found from the picture's solid parts). The icons of 03 sit on
a dark background with a glow: each is cut from its cell by flooding the background in from the cell's edge (pixels
darker than LIM; the grey icons use a lower one), then trimmed.
Writes textures/cooptown/pause/.

Run from the CoopTown_RP folder:  python tools/build-pause.py
"""
import os
from collections import deque
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "pause")
OUT = os.path.join(RP, "textures", "cooptown", "pause")
SHEET1 = {"panel": (1251, 42, 1614, 657), "frame": (57, 75, 1218, 570), "header": (57, 621, 1218, 705), "slot": (1272, 678, 1593, 894),
          "plate": (90, 735, 354, 804), "plate2": (375, 735, 642, 804), "divider": (702, 765, 1173, 783), "footer": (60, 837, 1218, 906)}
SHEET2 = {"big": (36, 102, 585, 267), "big_hover": (615, 102, 1158, 267), "big_pressed": (1188, 102, 1737, 267),
          "tile": (36, 300, 585, 462), "tile_hover": (615, 300, 1158, 462), "tile_pressed": (1188, 300, 1737, 462),
          "wide": (42, 492, 579, 582), "wide_hover": (624, 492, 1149, 582), "wide_pressed": (1194, 492, 1734, 582),
          "square": (657, 615, 774, 729), "square_hover": (825, 615, 945, 729), "square_pressed": (999, 615, 1116, 729),
          "dress": (480, 759, 843, 840), "key": (1122, 762, 1248, 840)}
# 03: 6 columns x 3 rows of cells; (name, column, row, LIM)
ROWS = [(0, 400), (400, 700), (700, 1024)]
ICONS = [("play", 0, 0, 85), ("gear", 1, 0, 55), ("chest", 2, 0, 85), ("book", 3, 0, 85), ("camera", 4, 0, 85), ("door", 5, 0, 85),
         ("shirt", 0, 1, 85), ("potion", 1, 1, 85), ("badge", 2, 1, 85), ("people", 3, 1, 55), ("globe", 4, 1, 55), ("next", 5, 1, 55),
         ("close", 0, 2, 55), ("grass", 1, 2, 85), ("dot", 2, 2, 85), ("sprout", 3, 2, 85), ("back", 4, 2, 85)]
SOLID = 100

def save(img, name, width):
    h = max(1, round(img.height * width / img.width))
    img.resize((width, h), Image.LANCZOS).save(os.path.join(OUT, name + ".png"))

def icon(sheet, col, row, lim):
    cw = sheet.width // 6
    cell = sheet.crop((col * cw, ROWS[row][0], (col + 1) * cw, ROWS[row][1])).convert("RGBA")
    w, h = cell.size; px = cell.load(); seen = bytearray(w * h)
    q = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y * w + x]: continue
        seen[y * w + x] = 1
        if max(px[x, y][:3]) >= lim: continue
        px[x, y] = (0, 0, 0, 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return cell.crop(cell.getchannel("A").point(lambda a: 255 if a > SOLID else 0).getbbox())

def main():
    os.makedirs(OUT, exist_ok=True)
    s1 = Image.open(os.path.join(SRC, "01_frames_panels.png")).convert("RGBA")
    s2 = Image.open(os.path.join(SRC, "02_button_states.png")).convert("RGBA")
    s3 = Image.open(os.path.join(SRC, "03_icons.png")).convert("RGBA")
    for name, b in SHEET1.items(): save(s1.crop(b), name, 1024 if b[2] - b[0] > 600 else 512)
    for name, b in SHEET2.items(): save(s2.crop(b), name, 512 if b[2] - b[0] > 200 else 128)
    for name, col, row, lim in ICONS: save(icon(s3, col, row, lim), "i_" + name, 96)
    print("pause pictures:", sorted(os.listdir(OUT)))

if __name__ == "__main__":
    main()
