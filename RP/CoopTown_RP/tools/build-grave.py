"""The grave (asked 2026-10-28): the stone a player's things wait in after they die (BP scripts/grave.js).
Writes models/entity/cooptown_grave.geo.json (a rounded headstone on a mound), textures/cooptown/grave.png and
entity/grave.entity.json. Run from the CoopTown_RP folder:  python -P tools/build-grave.py
"""
import json, os
from PIL import Image, ImageDraw

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 64, 64

def geo():
    # box uv: the stone at (0,0) (0,16) (0,22), the mound at (0,32), the flowers at (50,0) and (54,0)
    stone = [{"origin": [-5, 2, -1.5], "size": [10, 11, 3], "uv": [0, 0]},
             {"origin": [-4, 13, -1.5], "size": [8, 2, 3], "uv": [0, 16]},
             {"origin": [-2, 15, -1.5], "size": [4, 1, 3], "uv": [0, 22]}]
    mound = [{"origin": [-6, 0, -7], "size": [12, 2, 12], "uv": [0, 32]}]
    flowers = [{"origin": [3, 2, -5], "size": [1, 2, 1], "uv": [50, 0]}, {"origin": [-4, 2, -6], "size": [1, 2, 1], "uv": [54, 0]}]
    return {"format_version": "1.12.0", "minecraft:geometry": [{
        "description": {"identifier": "geometry.cooptown_grave", "texture_width": W, "texture_height": H,
                        "visible_bounds_width": 2, "visible_bounds_height": 2, "visible_bounds_offset": [0, 0.5, 0]},
        "bones": [{"name": "root", "pivot": [0, 0, 0], "cubes": mound + stone + flowers}]}]}

def texture():
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    import random; r = random.Random(7)
    def fill(x0, y0, x1, y1, base, spread=14):
        for y in range(y0, y1):
            for x in range(x0, x1):
                v = r.randint(-spread, spread); im.putpixel((x, y), tuple(max(0, min(255, c + v)) for c in base) + (255,))
    fill(0, 0, 26, 16, (128, 130, 136))      # stone sides and faces
    fill(0, 16, 22, 26, (140, 142, 148))     # stone top parts
    fill(0, 32, 48, 46, (92, 66, 42), 18)    # mound: earth
    for x in range(0, 48):                   # with grass on top (the top face and the upper sides)
        for y in range(32, 45):
            if r.random() < .55: im.putpixel((x, y), (70 + r.randint(0, 30), 120 + r.randint(0, 40), 50, 255))
    # a cross carved on the front face (box uv front of the 10x11x3 cube: x 3..13, y 3..14)
    for y in range(5, 12): im.putpixel((8, y), (78, 80, 86, 255))
    for x in range(6, 11): im.putpixel((x, 7), (78, 80, 86, 255))
    fill(50, 0, 54, 3, (230, 220, 90), 10); fill(54, 0, 58, 3, (220, 120, 170), 10)  # flowers
    return im

def main():
    os.makedirs(os.path.join(RP, "models/entity"), exist_ok=True); os.makedirs(os.path.join(RP, "textures/cooptown"), exist_ok=True)
    json.dump(geo(), open(os.path.join(RP, "models/entity/cooptown_grave.geo.json"), "w", encoding="utf8"), indent=1)
    texture().save(os.path.join(RP, "textures/cooptown/grave.png"))
    json.dump({"format_version": "1.10.0", "minecraft:client_entity": {"description": {
        "identifier": "cooptown:grave", "materials": {"default": "entity_alphatest"},
        "textures": {"default": "textures/cooptown/grave"}, "geometry": {"default": "geometry.cooptown_grave"},
        "render_controllers": ["controller.render.default"]}}},
        open(os.path.join(RP, "entity/grave.entity.json"), "w", encoding="utf8"), indent=1)
    print("grave: model, texture, client entity written")

if __name__ == "__main__":
    main()
