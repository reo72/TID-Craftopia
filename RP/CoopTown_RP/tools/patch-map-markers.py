"""Redraws only the map marker glyphs in font/glyph_E0.png (map_tiles.py PIXEL_MARKERS), in the cells they already
have (BP scripts/map-glyphs.js), without rebuilding the whole font: no glyph moves, no new characters.
Run from the CoopTown_RP folder:  python -P tools/patch-map-markers.py
"""
import os, re, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from map_tiles import pixel_marker, PIXEL_MARKERS

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GLYPHS = os.path.join(RP, "..", "..", "development_behavior_packs", "CoopTown_BP", "scripts", "map-glyphs.js")

def main():
    codes = dict(re.findall(r'"marker:(\w+)":\s*"\\u(e0[0-9a-f]{2})"', open(GLYPHS, encoding="utf8").read()))
    page = Image.open(os.path.join(RP, "font", "glyph_E0.png")).convert("RGBA"); cell = page.size[0] // 16
    for kind in PIXEL_MARKERS:
        if kind not in codes: print("no glyph for", kind); continue
        i = int(codes[kind], 16) & 0xFF; x, y = (i % 16) * cell, (i // 16) * cell
        tile = pixel_marker(kind)
        page.paste(Image.new("RGBA", (cell, cell), (0, 0, 0, 0)), (x, y))
        page.paste(tile, (x, y + (cell - tile.size[1]) // 2))  # where build-item-icons.py puts map glyphs
        print("marker", kind, codes[kind])
    page.save(os.path.join(RP, "font", "glyph_E0.png"))

if __name__ == "__main__":
    main()
