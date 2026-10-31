"""Imports the minimap sprites cut from the user's asset sheet (tools/assets/minimap/part_NN.png)
into textures/cooptown/map/: square, transparent-padded copies, plus the 8 rotated arrows."""
import os
from PIL import Image
RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "minimap")
OUT = os.path.join(RP, "textures", "cooptown", "map")
PARTS = {"sprite_arrow": 4, "marker_landmark": 5, "marker_player": 6, "marker_event": 7, "north": 8,
         "marker_player_blue": 9, "marker_landmark_found": 10, "marker_base": 11, "sun": 12, "moon": 13}

def square(im, size=128):
    """Centre the sprite on a transparent square and scale it to size x size."""
    side = max(im.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.alpha_composite(im, ((side - im.size[0]) // 2, (side - im.size[1]) // 2))
    return canvas.resize((size, size), Image.LANCZOS)

def main():
    for name, idx in PARTS.items():
        square(Image.open(os.path.join(SRC, "part_%02d.png" % idx)).convert("RGBA")).save(os.path.join(OUT, name + ".png"))
    arrow = square(Image.open(os.path.join(SRC, "part_04.png")).convert("RGBA"), 256)
    for d in range(8):  # 0 = north, clockwise; rotate the large copy, then shrink
        arrow.rotate(-45 * d, resample=Image.BICUBIC).resize((64, 64), Image.LANCZOS).save(os.path.join(OUT, "arrow_%d.png" % d))
    print("imported", len(PARTS), "sprites and 8 arrows")

if __name__ == "__main__":
    main()
