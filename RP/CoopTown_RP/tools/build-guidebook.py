"""Builds the menu book (cooptown:guidebook) as a 3D item held in the right hand, and its open state.

Source: D:/TID/3Dアイテム/本 (holy-text - Converted.geo.json, its animation, holy_text2.png: 128 x 128; holy_text.png is 16 x 16 and showed white), copied into
tools/assets/guidebook/. Writes models/entity/cooptown_guidebook.geo.json, animations/cooptown_guidebook.animation.json,
textures/cooptown/guidebook/book.png, attachables/guidebook.json and guidebook_open.json, and in the BP
items/guidebook_open.json.

Using the book (BP main.js) swaps it for cooptown:guidebook_open, whose attachable plays the opening animation once and
stays open; the menu opens when the animation is done and the closed book comes back when the menu closes.
The book is bound to the right arm (the player bone is repeated in the model, as for the backpack). HAND / HAND_FP set
where it sits: position (pixels, from the model's centre), rotation and scale.

Run from the CoopTown_RP folder:  python tools/build-guidebook.py
"""
import copy, json, os, shutil
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BP = os.path.join(os.path.dirname(os.path.dirname(RP)), "development_behavior_packs", "CoopTown_BP")
SRC = os.path.join(RP, "tools", "assets", "guidebook")
ORIGIN = "D:/TID/３Dアイテム/本"
CENTRE = [1.0, 2.3, 0.0]  # the closed book's middle (model pixels): 14 x 4.5 x 16 around here
ARM = [-5, 22, 0]          # the player's rightArm pivot
HAND = {"at": [-6.0, 11.0, -4.0], "rotation": [0, 180, 0], "scale": 0.45}     # third person: held at the right hand (Blockbench check 2026-10-21; turned 90 more sideways and a little smaller 2026-10-28)
HAND_FP = {"at": [-7.0, 10.0, -3.0], "rotation": [131.5861, -61.5727, -225.924], "scale": 0.42}  # first person: set in Blockbench (2026-10-21)
OPEN_TURN = {"rotation": {"0.0": [0, 0, 0], "0.5": [0, 0, 90]}, "position": {"0.0": [0, 0, 0], "0.5": [-10, 0, 0]}}
OPEN_SECONDS = 0.9          # the part of the animation the menu waits for (BP main.js BOOK_OPEN_TICKS)

def place(p):
    return {"position": [round(p["at"][i] - CENTRE[i], 3) for i in range(3)], "rotation": p["rotation"], "scale": p["scale"]}

def main():
    os.makedirs(SRC, exist_ok=True)
    for name in ["holy-text - Converted.geo.json", "holy-text - Converted.animation.json", "holy_text.png", "holy_text2.png"]:
        if os.path.exists(os.path.join(ORIGIN, name)):
            shutil.copy(os.path.join(ORIGIN, name), os.path.join(SRC, name))
    for d in ["models/entity", "animations", "attachables", "render_controllers", "textures/cooptown/guidebook"]:
        os.makedirs(os.path.join(RP, d), exist_ok=True)
    Image.open(os.path.join(SRC, "holy_text2.png")).convert("RGBA").save(os.path.join(RP, "textures/cooptown/guidebook/book.png"))
    src = json.load(open(os.path.join(SRC, "holy-text - Converted.geo.json"), encoding="utf8"))["minecraft:geometry"][0]
    g = copy.deepcopy(src)
    g["description"] = {**src["description"], "identifier": "geometry.cooptown_guidebook", "visible_bounds_width": 3, "visible_bounds_height": 3, "visible_bounds_offset": [0, 1, 0]}
    bones = g["bones"]
    for b in bones:
        if "parent" not in b: b["parent"] = "book"
    g["bones"] = [{"name": "rightArm", "pivot": ARM}, {"name": "book", "parent": "rightArm", "pivot": CENTRE}] + bones
    json.dump({"format_version": "1.12.0", "minecraft:geometry": [g]}, open(os.path.join(RP, "models/entity/cooptown_guidebook.geo.json"), "w", encoding="utf8"), indent=1)
    anim = json.load(open(os.path.join(SRC, "holy-text - Converted.animation.json"), encoding="utf8"))["animations"]["animation.book_open"]
    opened = {**copy.deepcopy(anim), "loop": "hold_on_last_frame"}
    # 2026-10-28: the source turns its pages (bone .. bone4) for 6 s after the covers open. The old extra turn of the
    # whole book (group: 90 degrees and 10 px aside) made the new book face sideways, so it is left out (OPEN_TURN).
    json.dump({"format_version": "1.8.0", "animations": {
        "animation.cooptown_guidebook.hand": {"loop": True, "bones": {"book": place(HAND)}},
        "animation.cooptown_guidebook.hand_fp": {"loop": True, "bones": {"book": place(HAND_FP)}},
        "animation.cooptown_guidebook.open": opened}},
        open(os.path.join(RP, "animations/cooptown_guidebook.animation.json"), "w", encoding="utf8"), indent=1)
    json.dump({"format_version": "1.8.0", "render_controllers": {"controller.render.cooptown_guidebook": {
        "geometry": "Geometry.default", "materials": [{"*": "Material.default"}], "textures": ["Texture.default"]}}},
        open(os.path.join(RP, "render_controllers/cooptown_guidebook.render_controllers.json"), "w", encoding="utf8"), indent=1)
    for item, opening in [("cooptown:guidebook", False), ("cooptown:guidebook_open", True)]:
        animations = {"hand": "animation.cooptown_guidebook.hand", "hand_fp": "animation.cooptown_guidebook.hand_fp"}
        animate = [{"hand_fp": "c.is_first_person"}, {"hand": "!c.is_first_person"}]
        if opening:
            animations["open"] = "animation.cooptown_guidebook.open"; animate.append("open")
        json.dump({"format_version": "1.10.0", "minecraft:attachable": {"description": {
            "identifier": item, "materials": {"default": "entity_alphatest", "enchanted": "entity_alphatest_glint"},
            "textures": {"default": "textures/cooptown/guidebook/book", "enchanted": "textures/misc/enchanted_item_glint"},
            "geometry": {"default": "geometry.cooptown_guidebook"}, "animations": animations,
            "scripts": {"animate": animate}, "render_controllers": ["controller.render.cooptown_guidebook"]}}},
            open(os.path.join(RP, "attachables", item.split(":")[1] + ".json"), "w", encoding="utf8"), indent=1)
    # the open book: the same item while the menu is open (not in the creative list)
    json.dump({"format_version": "1.21.90", "minecraft:item": {"description": {"identifier": "cooptown:guidebook_open", "menu_category": {"category": "none"}},
        "components": {"minecraft:display_name": {"value": "メニュー"}, "minecraft:icon": {"textures": {"default": "cooptown_guidebook"}},
                       "minecraft:max_stack_size": 1}}},
        open(os.path.join(BP, "items", "guidebook_open.json"), "w", encoding="utf8"), ensure_ascii=False, indent=2)
    print("guidebook: model, animations, attachables written")

if __name__ == "__main__":
    main()
