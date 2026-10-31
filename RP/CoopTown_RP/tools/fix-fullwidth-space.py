"""The full-width space (U+3000) in the pixel font: the game's own picture for it is a dotted box with "IDSP" in it,
so every '　' in CoopTown's screens showed as a box (2026-10-29 screenshot of 刻印の工房). This writes
font/glyph_30.png: the game's page for U+3000-30FF (kana) unchanged, except that cell, which becomes an empty
character as wide as a kana (two nearly see-through dots keep its width, like the HUD's hidden marks).
Reads the game's font from the install (build-item-icons.py). Run from the CoopTown_RP folder:
  python -P tools/fix-fullwidth-space.py
"""
import importlib.util, io, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); RP = os.path.dirname(HERE)
spec = importlib.util.spec_from_file_location("icons", os.path.join(HERE, "build-item-icons.py")); icons = importlib.util.module_from_spec(spec); spec.loader.exec_module(icons)
font = icons.read_archive(os.path.join(icons.GAME, "vanilla", "__brarchive", "font.brarchive"))
page = Image.open(io.BytesIO(font["glyph_30.png"])).convert("RGBA"); cell = page.size[0] // 16
blank = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
w = page.crop((2 * cell, 4 * cell, 3 * cell, 5 * cell)).getbbox()  # あ: how wide a kana is drawn
for x in (w[0], w[2] - 1): blank.putpixel((x, cell // 2), (255, 255, 255, 4))
page.paste(blank, (0, 0))
page.save(os.path.join(RP, "font", "glyph_30.png")); print("font/glyph_30.png: U+3000 is now a blank of width", w[2] - w[0])
