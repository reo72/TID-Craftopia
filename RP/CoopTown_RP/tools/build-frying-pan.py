"""Builds the frying pans (asked 2026-10-28): a 3D item in three levels, from the user's Blockbench model
D:/TID/３Dアイテム/フライパン (model.bbmodel, model.animation.json, texture.png = Lv1, texture2.png = Lv2,
texture3.png = Lv3; copied into tools/assets/frying_pan/).

Writes models/entity/cooptown_frying_pan.geo.json (the bbmodel converted to Bedrock geometry, bound to the right arm
like the menu book), animations/cooptown_frying_pan.animation.json (where it is held + the flip), the textures
textures/cooptown/frying_pan/pan_<n>.png, item icons textures/cooptown/items/frying_pan_<n>.png, item_texture.json
entries, attachables for cooptown:frying_pan_<n> and cooptown:frying_pan_<n>_flip, and the BP items.

Using a pan (BP frying-pan.js) swaps it for its _flip twin for FLIP_SECONDS, whose attachable plays the flip once.
HAND / HAND_FP set where it sits (pixels from the model's grip point, rotation, scale): tune them after a look in game.
Run from the CoopTown_RP folder:  python -P tools/build-frying-pan.py
"""
import json, os, shutil
from PIL import Image, ImageDraw

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BP = os.path.join(os.path.dirname(os.path.dirname(RP)), "development_behavior_packs", "CoopTown_BP")
ORIGIN = "D:/TID/３Dアイテム/フライパン"
SRC = os.path.join(RP, "tools", "assets", "frying_pan")
LEVELS = [(1, "フライパン", "texture.png"), (2, "上等なフライパン", "texture2.png"), (3, "名人のフライパン", "texture3.png")]
GRIP = [0.0, 6.0, 0.0]      # the handle's lower end in the model (pixels): what the hand holds
ARM = [-5, 22, 0]           # the player's rightArm pivot
# third person: the handle in the hand pointing forward, the inside up. Bedrock turns a bone by Rz(-z)·Ry(y)·Rx(-x)
# (x first); the model stands with the handle up (+y) and the inside facing -x, and the player faces -z, so [90, 0, 90]
# sends the handle to -z and the inside to +y ([0, -90, 90] showed the pan upright across the hips, 2026-10-28 screenshot)
HAND = {"at": [-6.0, 11.0, -1.0], "rotation": [90, 0, 90], "scale": 0.6}
HAND_FP = {"at": [-7.0, 10.0, -3.0], "rotation": [-60, 30, -90], "scale": 0.38}  # first person: turned over so the handle comes to the hand and the pan faces up, smaller (2026-10-28 screenshot)
# first person: the pan is turned end for end around the middle of the handle (TURN_PIVOT), so the handle comes to the
# hand and the pan points away (2026-10-28 screenshot: the pan was at the hand, the handle pointing away)
TURN_PIVOT = [0.0, 11.5, 0.0]
TURN_FP = [180, 0, 0]
# and rolled around the handle so the inside (the food) faces up instead of the bottom facing the eyes
ROLL_FP = [0, 180, 0]  # 90 showed the edge; the bottom had faced up, so a half turn
FLIP_SECONDS = 2.75

def place(p):
    return {"position": [round(p["at"][i] - GRIP[i], 3) for i in range(3)], "rotation": p["rotation"], "scale": p["scale"]}

def convert(bb, root):
    """Blockbench (bedrock, box UV) elements and groups -> Bedrock bones (x mirrored like Blockbench's export)."""
    els = {e["uuid"]: e for e in bb["elements"]}
    grp = {g["uuid"]: g for g in bb["groups"]}
    bones = []
    def cube(e):
        f, t = e["from"], e["to"]
        c = {"origin": [round(-t[0], 4), round(f[1], 4), round(f[2], 4)], "size": [round(t[i] - f[i], 4) for i in range(3)], "uv": e.get("uv_offset", [0, 0])}
        r = e.get("rotation")
        if r and any(r):
            o = e["origin"]; c["pivot"] = [round(-o[0], 4), round(o[1], 4), round(o[2], 4)]; c["rotation"] = [-r[0], -r[1], r[2]]
        return c
    def walk(node, parent):
        g = grp[node["uuid"]]; o = g["origin"]
        b = {"name": g["name"], "parent": parent, "pivot": [round(-o[0], 4), round(o[1], 4), round(o[2], 4)], "cubes": []}
        bones.append(b)
        for ch in node["children"]:
            if isinstance(ch, str): b["cubes"].append(cube(els[ch]))
            else: walk(ch, g["name"])
    for top in bb["outliner"]:
        walk(top, root)
    return bones

def icon(n):
    # a 32 x 32 picture: the pan from above, coloured like its level
    body = {1: (40, 40, 44), 2: (120, 122, 130), 3: (36, 36, 40)}[n]; rim = {1: (70, 70, 76), 2: (175, 178, 186), 3: (215, 170, 60)}[n]
    handle = {1: (110, 70, 35), 2: (110, 70, 35), 3: (160, 40, 40)}[n]
    im = Image.new("RGBA", (32, 32), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.line([(4, 28), (13, 19)], fill=(30, 22, 15), width=5); d.line([(4, 28), (13, 19)], fill=handle, width=3)
    d.ellipse([10, 4, 29, 23], fill=(20, 20, 22)); d.ellipse([11, 5, 28, 22], fill=rim); d.ellipse([13, 7, 26, 20], fill=body)
    d.ellipse([16, 10, 23, 17], fill=(250, 240, 210)); d.ellipse([18, 12, 21, 15], fill=(250, 190, 40))  # an egg
    if n == 3:
        for p in ((27, 3), (29, 6), (8, 8)): d.point(p, fill=(255, 245, 160))
    return im

def main():
    os.makedirs(SRC, exist_ok=True)
    for name in ["model.bbmodel", "model.animation.json"] + [t for _, _, t in LEVELS]:
        if os.path.exists(os.path.join(ORIGIN, name)): shutil.copy(os.path.join(ORIGIN, name), os.path.join(SRC, name))
    for d in ["models/entity", "animations", "attachables", "render_controllers", "textures/cooptown/frying_pan", "textures/cooptown/items"]:
        os.makedirs(os.path.join(RP, d), exist_ok=True)
    bb = json.load(open(os.path.join(SRC, "model.bbmodel"), encoding="utf8"))
    geo = {"format_version": "1.12.0", "minecraft:geometry": [{
        "description": {"identifier": "geometry.cooptown_frying_pan", "texture_width": 64, "texture_height": 64,
                        "visible_bounds_width": 3, "visible_bounds_height": 3, "visible_bounds_offset": [0, 1, 0]},
        "bones": [{"name": "rightArm", "pivot": ARM}, {"name": "pan", "parent": "rightArm", "pivot": GRIP},
                  {"name": "turn", "parent": "pan", "pivot": TURN_PIVOT}] + convert(bb, "turn")}]}
    json.dump(geo, open(os.path.join(RP, "models/entity/cooptown_frying_pan.geo.json"), "w", encoding="utf8"), indent=1)
    flip = json.load(open(os.path.join(SRC, "model.animation.json"), encoding="utf8"))["animations"]["animation.furaipan"]
    json.dump({"format_version": "1.8.0", "animations": {
        "animation.cooptown_frying_pan.hand": {"loop": True, "bones": {"pan": place(HAND)}},
        "animation.cooptown_frying_pan.hand_fp": {"loop": True, "bones": {"pan": place(HAND_FP), "turn": {"rotation": TURN_FP}, "bone": {"rotation": ROLL_FP}}},
        "animation.cooptown_frying_pan.flip": {**flip, "loop": False}}},
        open(os.path.join(RP, "animations/cooptown_frying_pan.animation.json"), "w", encoding="utf8"), indent=1)
    json.dump({"format_version": "1.8.0", "render_controllers": {"controller.render.cooptown_frying_pan": {
        "geometry": "Geometry.default", "materials": [{"*": "Material.default"}], "textures": ["Texture.default"]}}},
        open(os.path.join(RP, "render_controllers/cooptown_frying_pan.render_controllers.json"), "w", encoding="utf8"), indent=1)
    tex = json.load(open(os.path.join(RP, "textures/item_texture.json"), encoding="utf8"))
    for n, name, png in LEVELS:
        Image.open(os.path.join(SRC, png)).convert("RGBA").save(os.path.join(RP, f"textures/cooptown/frying_pan/pan_{n}.png"))
        if not os.path.exists(os.path.join(RP, "tools", "assets", "job_tools", f"frying_pan_{n}.webp")):  # else the user's art (import-job-tool-art.py)
            icon(n).save(os.path.join(RP, f"textures/cooptown/items/frying_pan_{n}.png"))
        tex["texture_data"][f"cooptown_frying_pan_{n}"] = {"textures": f"textures/cooptown/items/frying_pan_{n}"}
        for flipping in (False, True):
            item = f"cooptown:frying_pan_{n}" + ("_flip" if flipping else "")
            anims = {"hand": "animation.cooptown_frying_pan.hand", "hand_fp": "animation.cooptown_frying_pan.hand_fp"}
            animate = [{"hand_fp": "c.is_first_person"}, {"hand": "!c.is_first_person"}]
            if flipping: anims["flip"] = "animation.cooptown_frying_pan.flip"; animate.append("flip")
            json.dump({"format_version": "1.10.0", "minecraft:attachable": {"description": {
                "identifier": item, "materials": {"default": "entity_alphatest", "enchanted": "entity_alphatest_glint"},
                "textures": {"default": f"textures/cooptown/frying_pan/pan_{n}", "enchanted": "textures/misc/enchanted_item_glint"},
                "geometry": {"default": "geometry.cooptown_frying_pan"}, "animations": anims, "scripts": {"animate": animate},
                "render_controllers": ["controller.render.cooptown_frying_pan"]}}},
                open(os.path.join(RP, "attachables", item.split(":")[1] + ".json"), "w", encoding="utf8"), indent=1)
            comps = {"minecraft:display_name": {"value": name}, "minecraft:icon": {"textures": {"default": f"cooptown_frying_pan_{n}"}},
                     "minecraft:max_stack_size": 1, "minecraft:hand_equipped": True, "minecraft:damage": {"value": 2 + n},
                     "minecraft:interact_button": "フライパンを振る", "cooptown:frying_pan": {}}
            os.makedirs(os.path.join(BP, "items", "frying_pan"), exist_ok=True)
            json.dump({"format_version": "1.21.90", "minecraft:item": {"description": {"identifier": item,
                "menu_category": {"category": "none" if flipping else "equipment"}}, "components": comps}},
                open(os.path.join(BP, "items", "frying_pan", item.split(":")[1] + ".json"), "w", encoding="utf8"), ensure_ascii=False, indent=2)
    json.dump(tex, open(os.path.join(RP, "textures/item_texture.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print("frying pans: model, animations, attachables, items written")

if __name__ == "__main__":
    main()
