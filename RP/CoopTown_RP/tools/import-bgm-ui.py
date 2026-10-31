"""The town music sign at the bottom right of the HUD (asked 2026-10-30 with the user's zip
C:/Users/reo72/Downloads/TID_Craftopia_BGM_UI_Assets (1).zip, kept in tools/assets/bgm/): a turning record and two
rising notes, shown while the first town's music plays (BP town-bgm.js; RP build-hud-log.mjs bgmSign).

Writes textures/cooptown/bgm/:
- record_spin.png: FRAMES turns of the record side by side (FRAME px each), for a JSON UI flip_book animation;
- note_single.png / note_double.png: the notes, cut to what is drawn and scaled down.
Run from the CoopTown_RP folder:  python -P tools/import-bgm-ui.py
"""
import os
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "bgm")
OUT = os.path.join(RP, "textures", "cooptown", "bgm")
FRAMES, FRAME, NOTE = 32, 64, 32  # keep FRAMES / FRAME in step with build-hud-log.mjs BGM_SIGN

def trimmed(name):
    im = Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
    return im.crop(im.getbbox())

def main():
    os.makedirs(OUT, exist_ok=True)
    # turned about the middle of the gold label (2026-10-30: about the picture's middle it wobbled): a square around it
    # reaching the farthest drawn pixel
    rec = Image.open(os.path.join(SRC, "record.png")).convert("RGBA")
    px = rec.load(); gold = []; drawn = []
    for y in range(rec.height):
        for x in range(rec.width):
            r, g, b, a = px[x, y]
            if a > 128:
                drawn.append((x, y))
                if r > 150 and g > 100 and b < 90: gold.append((x, y))
    cx = sum(p[0] for p in gold) / len(gold); cy = sum(p[1] for p in gold) / len(gold)
    half = int(max(((x - cx) ** 2 + (y - cy) ** 2) ** .5 for x, y in drawn)) + 2
    sq = rec.crop((round(cx) - half, round(cy) - half, round(cx) + half, round(cy) + half))
    sheet = Image.new("RGBA", (FRAMES * FRAME, FRAME), (0, 0, 0, 0))
    for i in range(FRAMES):
        turned = sq.rotate(-360 * i / FRAMES, resample=Image.BICUBIC)  # clockwise
        sheet.paste(turned.resize((FRAME, FRAME), Image.LANCZOS), (i * FRAME, 0))
    sheet.save(os.path.join(OUT, "record_spin.png"))
    for n in ("note_single", "note_double"):
        im = trimmed(n)
        s = NOTE / max(im.size)
        im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS).save(os.path.join(OUT, n + ".png"))
    print("bgm sign:", sheet.size)

if __name__ == "__main__":
    main()
