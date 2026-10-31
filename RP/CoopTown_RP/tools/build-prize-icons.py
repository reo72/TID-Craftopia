"""Gacha prize icons from the vanilla item pictures, enlarged with a dark outline like the book's icons.
Writes textures/cooptown/icons/prize_<name>.png. Run from the CoopTown_RP folder: python tools/build-prize-icons.py
"""
import importlib.util, io, os
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("icons", os.path.join(RP, "tools", "build-item-icons.py"))
icons = importlib.util.module_from_spec(spec); spec.loader.exec_module(icons)

PRIZES = {"painting": "minecraft:painting", "flower_pot": "minecraft:flower_pot", "poppy": "minecraft:poppy", "name_tag": "minecraft:name_tag"}
SIZE = 128
OUTLINE = (40, 20, 12, 255)

for name, item in PRIZES.items():
    data = icons.texture(item)
    if not data:
        raise SystemExit("no texture for " + item)
    im = Image.open(io.BytesIO(data)).convert("RGBA")
    im = im.crop(im.getbbox())
    w, h = im.size
    out = Image.new("RGBA", (w + 2, h + 2), (0, 0, 0, 0))
    src = im.load(); dst = out.load()
    for y in range(h + 2):  # 1px outline around the opaque pixels
        for x in range(w + 2):
            if any(0 <= x - 1 + dx < w and 0 <= y - 1 + dy < h and src[x - 1 + dx, y - 1 + dy][3] > 100
                   for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                dst[x, y] = OUTLINE
    out.alpha_composite(im, (1, 1))
    side = max(out.size); scale = SIZE // side
    big = out.resize((out.width * scale, out.height * scale), Image.NEAREST)
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(big, ((SIZE - big.width) // 2, (SIZE - big.height) // 2))
    canvas.save(os.path.join(RP, "textures", "cooptown", "icons", "prize_%s.png" % name))
    print("prize_" + name, out.size)
