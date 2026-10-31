"""Builds the pictures of the miner's grindstone (ct:grind) and the woodcutter's 製材台 (ct:saw); tools/job-block-ui.mjs
lays them out (build-grind-ui.mjs, build-saw-ui.mjs).

No artwork of their own yet: they are the smoker's pictures (textures/cooptown/smoke/, made by build-smoke.py) in other
colours. grind: the copper and the embers turn steel blue; saw: warm wood brown. The smoker icon on the background's
title bar is painted over with the plain bar (the screen puts the block's picture there).
Writes textures/cooptown/grind/ and textures/cooptown/saw/.

Run from the CoopTown_RP folder (after build-smoke.py):  python tools/build-workshop.py
"""
import colorsys
import os
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "textures", "cooptown", "smoke")
NAMES = ["background", "recipe", "recipe_on", "button", "button_on", "action", "panel", "row", "square", "nav_left", "nav_right", "close"]
ICON = (282, 40, 392, 142)  # the smoker icon on the background (x0, y0, x1, y1)
PATCH_X = 600  # a plain stretch of the same bar, copied over it


def recolor(img, fn):
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a:
                px[x, y] = (*fn(r / 255, g / 255, b / 255), a)
    return img


def steel(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    if s > .25 and (h < .17 or h > .95):  # copper, amber, embers
        h, s = .55, s * .8
    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    return tuple(round(c * 255) for c in (r, g, b))


def wood(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    if s < .25:  # grey stone and iron: brown wood
        h, s, v = .08, .45 + s, min(1, v * 1.05)
    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    return tuple(round(c * 255) for c in (r, g, b))


def main():
    for out, fn in [("grind", steel), ("saw", wood)]:
        dst = os.path.join(RP, "textures", "cooptown", out)
        os.makedirs(dst, exist_ok=True)
        for name in NAMES:
            img = Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
            if name == "background":
                x0, y0, x1, y1 = ICON
                img.paste(img.crop((PATCH_X, y0, PATCH_X + x1 - x0, y1)), (x0, y0))
            recolor(img, fn).save(os.path.join(dst, name + ".png"))
        print(out, "pictures:", sorted(os.listdir(dst)))


if __name__ == "__main__":
    main()
