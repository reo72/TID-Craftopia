"""The user's drawn job-tool pictures (2026-10-28), replacing the code-drawn ones from build-job-tools.py.
The originals (big pictures, background already transparent) are kept in tools/assets/job_tools/<item>.webp (or .png;
watering_can_copper.png is the wooden can from the 2026-10-30 materials, the old copper picture is in old/); this crops and shrinks each to a 32 x 32 icon at textures/cooptown/items/<item>.png.
Run from the CoopTown_RP folder:  python -P tools/import-job-tool-art.py
"""
import os
from PIL import Image
SRC = os.path.join("tools", "assets", "job_tools")
SIZE = 32

def cut(im):
    # the pictures come with the background already cut away: keep only what is clearly drawn
    im = im.convert("RGBA"); a = im.getchannel("A").point(lambda v: 255 if v >= 128 else 0)
    im.putalpha(a)
    return im.crop(a.getbbox())

def icon(im):
    w, h = im.size; s = max(w, h)
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0)); sq.paste(im, ((s - w) // 2, (s - h) // 2))
    n = SIZE - 2  # a pixel of room on each side
    small = sq.resize((n, n), Image.NEAREST)
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0)); out.paste(small, (1, 1))
    return out

def main():
    for f in sorted(os.listdir(SRC)):
        k, ext = os.path.splitext(f)
        if ext.lower() not in (".webp", ".png"): continue
        im = Image.open(os.path.join(SRC, f))
        # an icon drawn at its size already (2026-10-30: the wooden can, tools/assets/materials) is used as it is
        (im.convert("RGBA") if im.size == (SIZE, SIZE) else icon(cut(im))).save(os.path.join("textures", "cooptown", "items", k + ".png"))
        print("icon", k)

if __name__ == "__main__":
    main()
