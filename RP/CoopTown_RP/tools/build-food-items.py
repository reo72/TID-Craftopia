"""Builds the CoopTown dishes and potions as items: pictures, item_texture.json names, and the BP item files.

Dishes (BP scripts/food-config.js DISHES): each picture is a vanilla food's icon (textures/cooptown/items/, exported by
build-item-icons.py) recoloured, a stand-in until drawn ones come. Potions (potion-config.js POTIONS): a drawn 16 x 16
bottle filled with the potion's colour. The BP items: dishes are foods (hunger points and saturation from DISHES,
bowls / bottles given back), potions are drunk with no hunger and give the empty bottle back; their effects are
scripted (food-runtime.js).

Run from the CoopTown_RP folder:  python tools/build-food-items.py
(--potions: only the potions, leaving the dish pictures as they are)
"""
import json, os, re, subprocess, sys
from PIL import Image, ImageEnhance, ImageOps

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BP = os.path.join(os.path.dirname(os.path.dirname(RP)), "development_behavior_packs", "CoopTown_BP")
ICONS = os.path.join(RP, "textures", "cooptown", "items")

def config():
    """DISHES and POTIONS read from the BP scripts with node."""
    url = "file:///" + os.path.join(BP, "scripts").replace("\\", "/")
    code = ("const f=await import(%s);const p=await import(%s);console.log(JSON.stringify({dishes:f.DISHES,potions:p.POTIONS}))"
            % (json.dumps(url + "/food-config.js"), json.dumps(url + "/potion-config.js")))
    # the scripts import @minecraft/server: the tests' stand-ins (tools/tests/register.mjs) answer for it
    reg = "file:///" + os.path.join(RP, "tools", "tests", "register.mjs").replace("\\", "/")
    out = subprocess.run(["node", "--import", reg, "--input-type=module", "-e", code], capture_output=True, text=True, encoding="utf8", check=True).stdout
    out = out[out.index("{"):]
    return json.loads(out)

def tint(img, rgb, amount=0.55):
    """Recolours an icon towards rgb, keeping its shading and transparency."""
    a = img.getchannel("A"); grey = ImageOps.grayscale(img.convert("RGB"))
    col = ImageOps.colorize(grey, black=(0, 0, 0), white=rgb).convert("RGB")
    out = Image.blend(img.convert("RGB"), col, amount); out.putalpha(a); return out

# dish key -> (base vanilla icon, colour, blend, brightness)
DISH_LOOK = {"veg_soup": ("beetroot_soup", (230, 150, 60), .6, 1.05), "meat_stew": ("rabbit_stew", (150, 80, 40), .4, 1),
             "fish_set": ("cooked_salmon", (240, 200, 140), .25, 1.05), "milk_pudding": ("milk_bucket", (250, 220, 140), .65, 1.1),
             "fruit_tart": ("pumpkin_pie", (220, 60, 90), .55, 1.05), "smoked_meat": ("cooked_beef", (90, 50, 30), .45, .85),
             "smoked_fish": ("cooked_cod", (120, 80, 40), .45, .85), "dried_meat": ("cooked_beef", (150, 110, 80), .55, .95),
             "dried_fish": ("cooked_cod", (180, 160, 120), .55, .95), "jar_preserve": ("honey_bottle", (200, 90, 60), .6, 1)}
BOTTLE = ["......kk........", ".....kwwk.......", ".....kbbk.......", "......kk........", ".....kwwk.......", "....kwllwk......",
          "...kwllllwk.....", "..kwllllllwk....", "..kllllllllk....", "..kllllllllk....", "..kllllllllk....", "..kdllllllldk...",
          "...kdddddddk....", "....kkkkkkk.....", "................", "................"]

def bottle(rgb):
    img = Image.new("RGBA", (16, 16)); px = img.load()
    dark = tuple(int(c * .6) for c in rgb); light = tuple(min(255, int(c * .5 + 128)) for c in rgb)
    cols = {"k": (40, 30, 40, 255), "w": (220, 230, 240, 255), "b": (150, 100, 60, 255), "l": rgb + (255,), "d": dark + (255,)}
    for y, row in enumerate(BOTTLE):
        for x, ch in enumerate(row):
            if ch in cols: px[x + 1, y + 1] = cols[ch]
    px[5, 8] = light + (255,); px[5, 9] = light + (255,)
    return img.resize((32, 32), Image.NEAREST)

def item(identifier, name, icon, components):
    return {"format_version": "1.21.90", "minecraft:item": {"description": {"identifier": identifier, "menu_category": {"category": "items"}},
            "components": {"minecraft:display_name": {"value": name}, "minecraft:icon": {"textures": {"default": icon}}, **components}}}

def main():
    cfg = config()
    tex = json.load(open(os.path.join(RP, "textures", "item_texture.json"), encoding="utf8"))
    for sub in ("dishes", "potions"): os.makedirs(os.path.join(RP, "textures", "cooptown", sub), exist_ok=True)
    os.makedirs(os.path.join(BP, "items"), exist_ok=True)
    for key, (name, hunger, sat, container, anim) in ({} if "--potions" in sys.argv else cfg["dishes"]).items():
        base, rgb, amount, bright = DISH_LOOK[key]
        img = ImageEnhance.Brightness(tint(Image.open(os.path.join(ICONS, base + ".png")).convert("RGBA"), rgb, amount)).enhance(bright)
        img.save(os.path.join(RP, "textures", "cooptown", "dishes", key + ".png"))
        icon = "cooptown_dish_" + key; tex["texture_data"][icon] = {"textures": "textures/cooptown/dishes/" + key}
        food = {"nutrition": hunger, "saturation_modifier": sat, "can_always_eat": False}
        if container: food["using_converts_to"] = container
        comps = {"minecraft:food": food, "minecraft:use_modifiers": {"use_duration": 1.6, "movement_modifier": .35},
                 "minecraft:use_animation": anim, "minecraft:max_stack_size": 1 if container == "minecraft:bowl" else 16}
        json.dump(item("cooptown:" + key, name, icon, comps), open(os.path.join(BP, "items", "dish_" + key + ".json"), "w", encoding="utf8"), ensure_ascii=False, indent=2)
    for p in cfg["potions"]:
        bottle(tuple(p["color"])).save(os.path.join(RP, "textures", "cooptown", "potions", p["key"] + ".png"))
        icon = "cooptown_potion_" + p["key"]; tex["texture_data"][icon] = {"textures": "textures/cooptown/potions/" + p["key"]}
        comps = {"minecraft:food": {"nutrition": 0, "saturation_modifier": 0, "can_always_eat": True, "using_converts_to": "minecraft:glass_bottle"},
                 "minecraft:use_modifiers": {"use_duration": 1.6, "movement_modifier": .35}, "minecraft:use_animation": "drink",
                 "minecraft:max_stack_size": 8, "minecraft:glint": p["rank"] == 2}
        json.dump(item(p["id"], p["name"], icon, comps), open(os.path.join(BP, "items", "potion_" + p["key"] + ".json"), "w", encoding="utf8"), ensure_ascii=False, indent=2)
    json.dump(tex, open(os.path.join(RP, "textures", "item_texture.json"), "w", encoding="utf8"), ensure_ascii=False, indent=2)
    print("dishes:", len(cfg["dishes"]), "potions:", len(cfg["potions"]))

if __name__ == "__main__":
    main()
