"""Square minimap frame from the user's picture (tools/assets/minimap/ivy_frame.webp).

The white around the frame and inside it becomes transparent (flood fill from the edges and the
centre, so white parts of the frame itself are kept). Writes textures/cooptown/map/frame_ivy.png and prints its inner opening as fractions of the
picture, for tools/build-hud-log.mjs (IVY).
Run from the CoopTown_RP folder: python tools/import-ivy-frame.py
"""
import os
from collections import deque
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "minimap", "ivy_frame.webp")
OUT = os.path.join(RP, "textures", "cooptown", "map", "frame_ivy.png")
SIZE = 256
THICK = 0.6  # border thickness compared to the original picture
# 9-slice edges as fractions of the picture: large enough to hold the ivy (top-left, bottom-right)
SLICE = (.28, .37, .28, .35)

def is_white(p):
    return min(p[:3]) > 225

def clear(im, seeds):
    px = im.load(); w, h = im.size
    todo = deque(s for s in seeds if is_white(px[s])); seen = set(todo)
    while todo:
        x, y = todo.popleft()
        px[x, y] = (0, 0, 0, 0)
        for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= n[0] < w and 0 <= n[1] < h and n not in seen and is_white(px[n]):
                seen.add(n); todo.append(n)

im = Image.open(SRC).convert("RGBA")
w, h = im.size
clear(im, [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)] + [(w // 2, h // 2)])
# soften the light fringe left by the anti-aliased edge: near-white pixels next to cleared ones go too
px = im.load()
for y in range(1, h - 1):
    for x in range(1, w - 1):
        p = px[x, y]
        if p[3] and min(p[:3]) > 190 and any(px[n][3] == 0 for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))):
            px[x, y] = (0, 0, 0, 0)
im = im.crop(im.getbbox())
w, h = im.size
# inner opening: the transparent run around the centre
px = im.load()
def opening(solid, n):
    # a line counts as frame when most of the middle band is opaque (ignores stray pixels)
    c = n // 2; a = c; b = c
    while a > 0 and not solid(a - 1): a -= 1
    while b < n - 1 and not solid(b + 1): b += 1
    return a, b + 1
band = lambda n: range(int(n * .35), int(n * .65))
x0, x1 = opening(lambda x: sum(px[x, y][3] > 128 for y in band(h)) > len(band(h)) * .5, w)
y0, y1 = opening(lambda y: sum(px[x, y][3] > 128 for x in band(w)) > len(band(w)) * .5, h)
# thinner border: shrink the picture by THICK, then stretch only its straight edges (9-slice, done
# here because the game's own 9-slice scaled differently) until the opening is as big as before
sw, sh = round(w * THICK), round(h * THICK)
small = im.resize((sw, sh), Image.LANCZOS)
cw, ch = sw + round((x1 - x0) * (1 - THICK)), sh + round((y1 - y0) * (1 - THICK))
l, t, r, b = (round(f * n) for f, n in zip(SLICE, (sw, sh, sw, sh)))
canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
xs, xd = (0, l, sw - r, sw), (0, l, cw - r, cw)
ys, yd = (0, t, sh - b, sh), (0, t, ch - b, ch)
for i in range(3):
    for j in range(3):
        part = small.crop((xs[i], ys[j], xs[i + 1], ys[j + 1]))
        canvas.paste(part.resize((xd[i + 1] - xd[i], yd[j + 1] - yd[j]), Image.NEAREST), (xd[i], yd[j]))
nx0, ny0 = x0 * THICK, y0 * THICK
nx1, ny1 = cw - (w - x1) * THICK, ch - (h - y1) * THICK
canvas.resize((SIZE, round(SIZE * ch / cw)), Image.LANCZOS).save(OUT)
old = OUT[:-4] + ".json"
if os.path.exists(old):
    os.remove(old)  # no game 9-slice
print("IVY={x0:%.4f,x1:%.4f,y0:%.4f,y1:%.4f}" % (nx0 / cw, nx1 / cw, ny0 / ch, ny1 / ch))
