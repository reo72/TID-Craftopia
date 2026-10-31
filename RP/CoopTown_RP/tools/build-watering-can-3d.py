"""The watering cans held as a 3D model (asked 2026-10-28), from the user's Blockbench model
D:/TID/３Dアイテム/ジョーロ (初級じょうろ.geo.json / .png, copied into tools/assets/watering_can/ as model.geo.json and
texture.png). The model is the first can (木製のジョーロ); the higher ones use the same model with the wood recoloured
(TINTS), the water left as it is. The item icons stay the user's drawn ones (import-job-tool-art.py).

Writes models/entity/cooptown_watering_can.geo.json (the model re-rooted under the right arm, like the frying pan),
animations/cooptown_watering_can.animation.json, render_controllers/cooptown_watering_can.render_controllers.json,
textures/cooptown/watering_can/<tier>.png and attachables/watering_can_<tier>.json.
HAND / HAND_FP set where it sits (pixels from the grip, rotation, scale): tune them after a look in game.
The model stands upright with its spout towards -z and its handle at +z; on the right arm that -z points out to the
player's side, so the third-person pose turns it a quarter round to bring the spout forward.
Run from the CoopTown_RP folder:  python -P tools/build-watering-can-3d.py
"""
import json, os, colorsys
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "watering_can")
TIERS = ["copper", "iron", "gold", "master"]
# hue, saturation scale, lightness scale for the wood of each tier (None: the picture as drawn)
TINTS = {"copper": None, "iron": (0.6, 0.08, 1.25), "gold": (0.13, 1.4, 1.35), "master": (0.46, 0.9, 1.15)}
GRIP = [0.0, 7.6, 8.0]      # the middle of the handle (pixels in the model)
ARM = [-5, 22, 0]           # the player's rightArm pivot
# third person: [0, 0, 0] and [0, 90, 0] both showed the spout out to the player's side, seen from the front in profile
# (2026-10-28 screenshots): the arm's frame is turned on a slant there, so 135 brings the spout round to the front
HAND = {"at": [-6.0, 12.0, -0.5], "rotation": [0, 135, 0], "scale": 0.6}
# first person: x 45 leaned the top towards the eyes, x 0 laid it on its side (2026-10-28 screenshots): x 90 stands it up
HAND_FP = {"at": [-7.0, 10.0, -3.0], "rotation": [90, -15, 0], "scale": 0.32}

def place(p):
    return {"position": [round(p["at"][i] - GRIP[i], 3) for i in range(3)], "rotation": p["rotation"], "scale": p["scale"]}

def tinted(im, tint):
    if not tint: return im
    h0, sk, lk = tint; out = im.copy(); px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if not a or b > r: continue  # see-through or the water: kept
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hls_to_rgb(h0, min(1, l * lk), min(1, s * sk))
            px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return out

def main():
    for d in ["models/entity", "animations", "attachables", "render_controllers", "textures/cooptown/watering_can"]:
        os.makedirs(os.path.join(RP, d), exist_ok=True)
    src = json.load(open(os.path.join(SRC, "model.geo.json"), encoding="utf8"))["minecraft:geometry"][0]
    bones = [dict(b, parent=b.get("parent", "can")) for b in src["bones"]]
    desc = dict(src["description"], identifier="geometry.cooptown_watering_can")
    json.dump({"format_version": "1.12.0", "minecraft:geometry": [{"description": desc,
        "bones": [{"name": "rightArm", "pivot": ARM}, {"name": "can", "parent": "rightArm", "pivot": GRIP}] + bones}]},
        open(os.path.join(RP, "models/entity/cooptown_watering_can.geo.json"), "w", encoding="utf8"), indent=1)
    json.dump({"format_version": "1.8.0", "animations": {
        "animation.cooptown_watering_can.hand": {"loop": True, "bones": {"can": place(HAND)}},
        "animation.cooptown_watering_can.hand_fp": {"loop": True, "bones": {"can": place(HAND_FP)}}}},
        open(os.path.join(RP, "animations/cooptown_watering_can.animation.json"), "w", encoding="utf8"), indent=1)
    json.dump({"format_version": "1.8.0", "render_controllers": {"controller.render.cooptown_watering_can": {
        "geometry": "Geometry.default", "materials": [{"*": "Material.default"}], "textures": ["Texture.default"]}}},
        open(os.path.join(RP, "render_controllers/cooptown_watering_can.render_controllers.json"), "w", encoding="utf8"), indent=1)
    base = Image.open(os.path.join(SRC, "texture.png")).convert("RGBA")
    for tier in TIERS:
        tinted(base, TINTS[tier]).save(os.path.join(RP, f"textures/cooptown/watering_can/{tier}.png"))
        item = f"cooptown:watering_can_{tier}"
        json.dump({"format_version": "1.10.0", "minecraft:attachable": {"description": {
            "identifier": item, "materials": {"default": "entity_alphablend", "enchanted": "entity_alphatest_glint"},  # alphablend: the water is see-through
            "textures": {"default": f"textures/cooptown/watering_can/{tier}", "enchanted": "textures/misc/enchanted_item_glint"},
            "geometry": {"default": "geometry.cooptown_watering_can"},
            "animations": {"hand": "animation.cooptown_watering_can.hand", "hand_fp": "animation.cooptown_watering_can.hand_fp"},
            "scripts": {"animate": [{"hand_fp": "c.is_first_person"}, {"hand": "!c.is_first_person"}]},
            "render_controllers": ["controller.render.cooptown_watering_can"]}}},
            open(os.path.join(RP, "attachables", f"watering_can_{tier}.json"), "w", encoding="utf8"), indent=1)
    print("watering cans: model, animations, textures, attachables written")

if __name__ == "__main__":
    main()
