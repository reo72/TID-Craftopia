"""Builds the backpack: nine colours of cooptown:backpack_<colour>, a 3D model when held (in the hand) or in the off
hand (on the back), and the backpack screen's pictures (tools/build-backpack-ui.mjs lays them out).

Sources: tools/assets/backpack/ (the screen parts, the user's backpack_icon) and tools/assets/backpack/model/
(the user's model.geo.json and its nine colour textures, COLOURS below says which file is which colour).
Writes, in this RP: textures/cooptown/backpack/ (screen parts, icon_<colour> - the icon recoloured to the texture's
colour -, tex_<colour> model textures), models/entity/cooptown_backpack.geo.json (one geometry for the hand, one for the
back), animations/cooptown_backpack.animation.json, render_controllers/cooptown_backpack.render_controllers.json,
attachables/backpack_<colour>.json and the icons in textures/item_texture.json; in the BP: items/backpack_<colour>.json.

Run from the CoopTown_RP folder:  python tools/build-backpack.py
"""
import colorsys, copy, json, os
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BP = os.path.join(RP, "..", "..", "development_behavior_packs", "CoopTown_BP")
SRC = os.path.join(RP, "tools", "assets", "backpack")
MODEL = os.path.join(SRC, "model")
OUT = os.path.join(RP, "textures", "cooptown", "backpack")
SOLID = 100
# colour key, Japanese name, model texture file, the dye in its recipe
COLOURS = [("green", "緑", "texture - コピー (2).png", "green_dye"), ("blue", "青", "texture - コピー (3).png", "blue_dye"),
           ("lime", "黄緑", "texture - コピー (4).png", "lime_dye"), ("cyan", "水色", "texture - コピー (5).png", "cyan_dye"),
           ("purple", "紫", "texture - コピー (6).png", "purple_dye"), ("pink", "ピンク", "texture - コピー (7).png", "pink_dye"),
           ("gray", "灰色", "texture - コピー (8).png", "gray_dye"), ("brown", "茶色", "texture - コピー.png", "brown_dye"),
           ("yellow", "黄色", "texture.png", "yellow_dye")]  # brown: the reddish-brown one (like the screen's leather); yellow: the ochre one
# where the model sits (pixels, model space); the model is about 13 x 12.6 x 7 around CENTRE
CENTRE = [-0.6, 6.3, 1.4]
HAND = {"scale": 1.0, "at": [6.0, CENTRE[1], 0.0], "rotation": [0, 90, 0]}  # held: actual size, hanging sideways at the left arm (asked)
HAND_FP = {"scale": 1.0, "at": [6.0, CENTRE[1], 0.0], "rotation": [0, 90, 0]}  # first person: the same
BACK = {"scale": 1.0, "at": [CENTRE[0], CENTRE[1] + 12, 5.45], "rotation": [0, 0, 0]}  # off hand: on the back (+z, seen in game), actual size, turned round so its front faces out; its 6.9 depth starts at the body back (z = 2)

def load(name):
    img = Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
    return img.crop(img.getchannel("A").point(lambda a: 255 if a > SOLID else 0).getbbox())

def save(img, name, width):
    h = max(1, round(img.height * width / img.width))
    img.resize((width, h), Image.LANCZOS).save(os.path.join(OUT, name + ".png"))

def average_hsv(path):
    px = [p for p in Image.open(path).convert("RGBA").getdata() if p[3] > 200]
    r, g, b = (sum(p[i] for p in px) / len(px) / 255 for i in range(3))
    return colorsys.rgb_to_hsv(r, g, b)

def recolour(icon, hsv):
    """The icon's leather (warm, saturated pixels) moved to the texture's hue; buckles and outlines kept."""
    h2, s2, _ = hsv
    out = icon.copy(); px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a < 20: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if 0.0 <= h <= 0.11 and s > 0.25:   # brown leather (gold buckles are ~0.12-0.17)
                nh, ns = (h, 0.0) if s2 < 0.05 else (h2, min(1, s * (s2 / 0.38)))
                r2, g2, b2 = colorsys.hsv_to_rgb(nh, ns, v)
                px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a)
    return out

def geometry(name, parent):
    src = json.load(open(os.path.join(MODEL, "model.geo.json"), encoding="utf8"))["minecraft:geometry"][0]
    g = copy.deepcopy(src)
    g["description"] = {**src["description"], "identifier": name, "visible_bounds_width": 3, "visible_bounds_height": 3.5, "visible_bounds_offset": [0, 1.25, 0]}
    bone = g["bones"][0]
    # the player bone is repeated in the attachable (same name and pivot) so the model is bound to it and moves with
    # it; a bare "parent" naming the player bone did not follow the arm in game
    pivots = {"leftArm": [5, 22, 0], "body": [0, 24, 0]}
    g["bones"] = [{"name": parent, "pivot": pivots[parent]}, {"name": "backpack", "parent": parent, "pivot": CENTRE, "cubes": bone["cubes"]}]
    return g

def place(p):
    """Animation bone values moving the model's centre to p["at"], scaled (and turned) around its centre."""
    v = {"position": [round(p["at"][i] - CENTRE[i], 3) for i in range(3)], "scale": p["scale"]}
    if "rotation" in p: v["rotation"] = p["rotation"]
    return v

def main():
    os.makedirs(OUT, exist_ok=True)
    for d in ["models/entity", "animations", "render_controllers", "attachables"]:
        os.makedirs(os.path.join(RP, d), exist_ok=True)
    # screen parts
    Image.open(os.path.join(SRC, "backpack_background.png")).convert("RGBA").save(os.path.join(OUT, "background.png"))
    for name, out, width in [("storage_slot_normal", "slot", 160), ("storage_slot_selected", "slot_on", 160), ("button_gray", "button", 384),
                             ("button_gold", "button_on", 512), ("button_leather", "leather", 384), ("detail_pocket", "pocket", 512),
                             ("heading_plaque", "plaque", 384), ("square_leather_button", "square", 128), ("close_icon", "close", 96)]:
        save(load(name), out, width)
    left = load("nav_left"); save(left, "nav_left", 64); save(left.transpose(Image.FLIP_LEFT_RIGHT), "nav_right", 64)
    icon = load("backpack_icon"); save(icon, "icon", 128)
    # model, animations, render controller
    json.dump({"format_version": "1.12.0", "minecraft:geometry": [geometry("geometry.cooptown_backpack_hand", "leftArm"),
               geometry("geometry.cooptown_backpack_back", "body")]},
              open(os.path.join(RP, "models/entity/cooptown_backpack.geo.json"), "w", encoding="utf8"), indent=1)
    json.dump({"format_version": "1.8.0", "animations": {
        "animation.cooptown_backpack.hand": {"loop": True, "bones": {"backpack": place(HAND)}},
        "animation.cooptown_backpack.hand_fp": {"loop": True, "bones": {"backpack": place(HAND_FP)}},
        "animation.cooptown_backpack.back": {"loop": True, "bones": {"backpack": place(BACK)}}}},
        open(os.path.join(RP, "animations/cooptown_backpack.animation.json"), "w", encoding="utf8"), indent=1)
    on_back = "(c.item_slot == 'off_hand')"
    json.dump({"format_version": "1.8.0", "render_controllers": {"controller.render.cooptown_backpack": {
        "arrays": {"geometries": {"Array.geo": ["Geometry.hand", "Geometry.back"]}},
        "geometry": f"Array.geo[{on_back} ? 1 : 0]", "materials": [{"*": "Material.default"}], "textures": ["Texture.default"]}}},
        open(os.path.join(RP, "render_controllers/cooptown_backpack.render_controllers.json"), "w", encoding="utf8"), indent=1)
    textures = json.load(open(os.path.join(RP, "textures/item_texture.json"), encoding="utf8"))
    os.makedirs(os.path.join(BP, "items"), exist_ok=True)
    for key, ja, tex, dye in COLOURS:
        src = os.path.join(MODEL, tex)
        Image.open(src).convert("RGBA").save(os.path.join(OUT, "tex_" + key + ".png"))
        recolour(icon, average_hsv(src)).resize((64, round(64 * icon.height / icon.width)), Image.LANCZOS).save(os.path.join(OUT, "icon_" + key + ".png"))
        item = "cooptown:backpack_" + key
        textures["texture_data"]["cooptown_backpack_" + key] = {"textures": "textures/cooptown/backpack/icon_" + key}
        json.dump({"format_version": "1.10.0", "minecraft:attachable": {"description": {
            "identifier": item, "materials": {"default": "entity_alphatest", "enchanted": "entity_alphatest_glint"},
            "textures": {"default": "textures/cooptown/backpack/tex_" + key, "enchanted": "textures/misc/enchanted_item_glint"},
            "geometry": {"hand": "geometry.cooptown_backpack_hand", "back": "geometry.cooptown_backpack_back"},
            "animations": {"hand": "animation.cooptown_backpack.hand", "hand_fp": "animation.cooptown_backpack.hand_fp", "back": "animation.cooptown_backpack.back"},
            "scripts": {"animate": [{"back": on_back}, {"hand_fp": f"!{on_back} && c.is_first_person"}, {"hand": f"!{on_back} && !c.is_first_person"}]},
            "render_controllers": ["controller.render.cooptown_backpack"]}}},
            open(os.path.join(RP, "attachables", "backpack_" + key + ".json"), "w", encoding="utf8"), indent=1)
        json.dump({"format_version": "1.21.90", "minecraft:item": {
            "description": {"identifier": item, "menu_category": {"category": "equipment"}},
            "components": {"minecraft:display_name": {"value": f"バックパック（{ja}）"},
                           "minecraft:icon": {"textures": {"default": "cooptown_backpack_" + key}},
                           "minecraft:max_stack_size": 1, "minecraft:allow_off_hand": True,
                           "minecraft:interact_button": "バックパックを開く", "cooptown:open_backpack": {}}}},
            open(os.path.join(BP, "items", "backpack_" + key + ".json"), "w", encoding="utf8"), indent=2, ensure_ascii=False)
    json.dump(textures, open(os.path.join(RP, "textures/item_texture.json"), "w", encoding="utf8"), ensure_ascii=False, indent=2)
    print("backpack:", len(COLOURS), "colours;", sorted(os.listdir(OUT)))

if __name__ == "__main__":
    main()
