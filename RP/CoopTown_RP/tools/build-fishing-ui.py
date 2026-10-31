"""Fishing minigame pictures (tools/assets/fishing_ui, the user's set): cut to what is drawn (alpha > 40) and saved
smaller (nearest neighbour, the art is pixel art) to textures/cooptown/fishing/. Prints each size for build-hud-log.mjs.
Run: python tools/build-fishing-ui.py   (from the CoopTown_RP folder)"""
import os, json
from PIL import Image
RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT = os.path.join(RP, "tools", "assets", "fishing_ui"), os.path.join(RP, "textures", "cooptown", "fishing")
os.makedirs(OUT, exist_ok=True)
sizes = {}
for f in sorted(os.listdir(SRC)):
    if not f.endswith(".png"): continue
    im = Image.open(os.path.join(SRC, f)).convert("RGBA")
    a = im.getchannel("A").point(lambda v: 255 if v > 40 else 0)
    im = im.crop(a.getbbox())
    w = min(im.width, 512)
    im = im.resize((w, round(w * im.height / im.width)), Image.NEAREST)
    name = f[:-4]; im.save(os.path.join(OUT, f)); sizes[name] = im.size
json.dump(sizes, open(os.path.join(RP, "tools", "fishing-ui-sizes.json"), "w"), indent=1)
print(sizes)

# ---- pictures the set does not have, drawn here in its colours (pixel art, 1 px = 1 art pixel, scaled x8) ----
from PIL import ImageDraw, ImageFont
def save_px(name, im, k=8):
    im.resize((im.width * k, im.height * k), Image.NEAREST).save(os.path.join(OUT, name + ".png"))
WOOD, WOOD_D, WOOD_L, EDGE = (176, 120, 62, 255), (110, 70, 34, 255), (214, 160, 92, 255), (52, 32, 16, 255)
# the FISHING sign: a plank with dark edges; the word is a label drawn over it (build-hud-log.mjs)
sign = Image.new("RGBA", (52, 9), WOOD); d = ImageDraw.Draw(sign)
d.rectangle([0, 0, 51, 8], outline=EDGE)
for x in range(3, 50, 7): d.line([(x, 2), (x + 3, 2)], fill=WOOD_L); d.line([(x + 2, 6), (x + 5, 6)], fill=WOOD_D)
save_px("fishing_sign", sign)
# the ??? box: dark stone square with a light rim and the fish's silhouette
box = Image.new("RGBA", (30, 16), (40, 40, 42, 255)); d = ImageDraw.Draw(box)
d.rectangle([0, 0, 29, 15], outline=(20, 20, 20, 255)); d.rectangle([1, 1, 28, 14], outline=(78, 78, 80, 255))
save_px("unknown_box", box)
fish = Image.open(os.path.join(OUT, "fish_icon.png")).convert("RGBA")
sil = Image.new("RGBA", fish.size, (16, 16, 18, 255)); sil.putalpha(fish.getchannel("A").point(lambda v: 255 if v > 60 else 0))
sil.save(os.path.join(OUT, "fish_silhouette.png"))
# the gauge boxes: a dark inset panel
gb = Image.new("RGBA", (40, 6), (34, 34, 36, 255)); d = ImageDraw.Draw(gb)
d.rectangle([0, 0, 39, 5], outline=(22, 22, 22, 255)); d.line([(1, 1), (38, 1)], fill=(52, 52, 54, 255))
save_px("gauge_box", gb)
# plain bars like the mockup: empty track and the two fills
for name, top, mid, low in [("bar_empty", (40, 40, 40), (28, 28, 28), (22, 22, 22)), ("bar_catch", (120, 230, 110), (60, 190, 60), (30, 140, 40)),
                            ("bar_tension", (255, 170, 80), (240, 120, 40), (200, 70, 30))]:
    bar = Image.new("RGBA", (40, 4), mid + (255,)); d = ImageDraw.Draw(bar)
    d.line([(0, 0), (39, 0)], fill=top + (255,)); d.line([(0, 3), (39, 3)], fill=low + (255,))
    save_px(name, bar)
# the reel icon on the 巻く button: a wheel with a handle, light green
reel = Image.new("RGBA", (11, 9), (0, 0, 0, 0)); d = ImageDraw.Draw(reel); L = (225, 255, 210, 255)
d.ellipse([0, 0, 8, 8], outline=L); d.line([(4, 0), (4, 8)], fill=L); d.line([(0, 4), (8, 4)], fill=L); d.line([(8, 4), (10, 4)], fill=L); d.point((10, 3), fill=L)
save_px("reel_icon", reel)
print("drawn: fishing_sign unknown_box fish_silhouette gauge_box bar_* reel_icon")
