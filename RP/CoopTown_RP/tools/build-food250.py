"""Builds the 250 foods and 34 materials of the food catalogue (Notion「食品250品・材料34品」) into the addon.

Source: tools/assets/food250/ (catalogue.json, 00_rules.md, textures/items/food/<id>.png, 32 x 32).
Writes:
  RP  textures/cooptown/food/<id>.png and their names in textures/item_texture.json (cooptown_food_<id>)
  BP  items/food/<id>.json (foods: hunger points = the normal quality's H; drinks can be drunk when full; the bowl,
      bottle or cup a dish comes in is given back after eating; intermediate materials and the new ingredients are
      not eaten)
  BP  scripts/food-catalog.js: every entry with its ingredients as item ids (parsed from the Japanese recipe text),
      the containers given back when cooking, the output count, the qualities' H / S, the shelf life and the
      cooking station and level (scripts: food-config.js, cook-config.js, smoke-config.js read it).
Ids are cooptown:<catalogue id>. cooptown:trail_ration (already the 探索食 supply item) and cooptown:milk_pudding
(an earlier dish) become the catalogue's foods.

Run from the CoopTown_RP folder:  python tools/build-food250.py
"""
import json, os, re, shutil

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BP = os.path.join(os.path.dirname(os.path.dirname(RP)), "development_behavior_packs", "CoopTown_BP")
SRC = os.path.join(RP, "tools", "assets", "food250")
M = lambda i: "minecraft:" + i
# Japanese ingredient names -> item ids (vanilla); catalogue names are added from the catalogue itself.
# water: a bottle of water (a minecraft:potion holding water; the scripts check it)
VANILLA = {"パン": M("bread"), "ハチミツ": M("honey_bottle"), "ニンジン": M("carrot"), "卵": M("egg"), "焼きサケ": M("cooked_salmon"),
           "焼きダラ": M("cooked_cod"), "焼き鳥": M("cooked_chicken"), "サケ": M("salmon"), "タラ": M("cod"), "牛肉": M("beef"),
           "豚肉": M("porkchop"), "羊肉": M("mutton"), "ウサギ肉": M("rabbit"), "鶏肉": M("chicken"), "ジャガイモ": M("potato"),
           "カボチャ": M("pumpkin"), "カボチャの種": M("pumpkin_seeds"), "ビートルート": M("beetroot"), "リンゴ": M("apple"),
           "スイートベリー": M("sweet_berries"), "グロウベリー": M("glow_berries"), "スイカの薄切り": M("melon_slice"), "小麦": M("wheat"),
           "小麦の種": M("wheat_seeds"), "砂糖": M("sugar"), "ミルク": M("milk_bucket"), "茶色のキノコ": M("brown_mushroom"),
           "赤いキノコ": M("red_mushroom"), "乾燥した昆布": M("dried_kelp"), "ガラス瓶": M("glass_bottle"), "ボウル": M("bowl"),
           "水入り瓶": "water", "氷": M("ice"), "骨": M("bone"), "カカオ豆": M("cocoa_beans"), "棒": M("stick"), "レンガ": M("brick")}
# containers an ingredient comes in, given back when the cooking starts (honey bottle, milk bucket)
RETURN_ON_COOK = {M("honey_bottle"): M("glass_bottle"), M("milk_bucket"): M("bucket")}
CONTAINERS = {"ガラス瓶": M("glass_bottle"), "minecraft:glass_bottle": M("glass_bottle"), "ボウル": M("bowl"), "minecraft:bowl": M("bowl"),
              "共通カップ": "cooptown:cup", "tid:cup": "cooptown:cup"}
TABS = {"主食・軽食": 0, "スープ・主菜": 1, "甘味・お菓子": 2, "飲み物": 3, "中間素材": 0}

# stand-in pictures for the entries the texture set does not have yet (shape, colour); replaced when drawn ones come
STANDIN = {"roasted_rice_tea": ("cup", (170, 120, 60)), "black_coffee": ("cup", (50, 30, 20)), "cafe_latte": ("cup", (190, 150, 110)),
           "cafe_mocha": ("cup", (110, 70, 45)), "grape_soda": ("bottle", (130, 60, 170)), "apple_soda": ("bottle", (220, 170, 70)),
           "mint_melon_soda": ("bottle", (110, 210, 150)), "rice": ("grains", (240, 236, 220)), "tomato": ("round", (220, 50, 40)),
           "onion": ("round", (215, 175, 110)), "cabbage": ("round", (130, 190, 90)), "cucumber": ("long", (60, 140, 60)),
           "corn": ("long", (240, 200, 60)), "lemon": ("round", (245, 225, 70)), "grape": ("grains", (120, 60, 150)),
           "strawberry": ("round", (230, 60, 80)), "tea_leaves": ("grains", (70, 120, 50)), "coffee_beans": ("grains", (90, 55, 35)),
           "salt": ("bag", (235, 235, 235)), "mint": ("grains", (90, 190, 110)), "black_pepper": ("grains", (40, 40, 40)),
           "soybeans": ("grains", (220, 200, 130)), "flour": ("bag", (245, 240, 225)), "bread_dough": ("round", (235, 210, 160)),
           "fresh_noodles": ("grains", (240, 225, 170)), "cooked_rice": ("bowl", (245, 245, 240)), "butter": ("block", (245, 220, 110)),
           "cream": ("jar", (250, 248, 235)), "cheese": ("block", (245, 200, 70)), "yogurt": ("jar", (245, 245, 250)),
           "cooking_oil": ("bottle", (235, 200, 80)), "vinegar": ("bottle", (230, 210, 170)), "soy_sauce": ("bottle", (70, 35, 20)),
           "tofu": ("block", (245, 245, 235)), "minced_meat": ("grains", (200, 80, 80)), "raw_sausage": ("long", (210, 110, 100)),
           "vegetable_stock": ("jar", (190, 160, 80)), "tomato_sauce": ("jar", (200, 50, 40)), "cocoa_powder": ("bag", (110, 70, 45)),
           "gelatin": ("block", (235, 225, 190)), "cup": ("cup", (230, 225, 215))}

def standin(shape, rgb):
    from PIL import Image, ImageDraw
    img = Image.new("RGBA", (32, 32)); d = ImageDraw.Draw(img); dark = tuple(int(c * .6) for c in rgb) + (255,); col = rgb + (255,)
    if shape == "round": d.ellipse((6, 7, 25, 26), fill=col, outline=dark, width=2); d.rectangle((14, 4, 17, 8), fill=(70, 120, 40, 255))
    elif shape == "long": d.rounded_rectangle((11, 3, 20, 28), 4, fill=col, outline=dark, width=2)
    elif shape == "grains":
        for x, y in [(8, 9), (16, 7), (22, 12), (10, 17), (18, 16), (13, 23), (21, 22)]: d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=col, outline=dark)
    elif shape == "bag": d.polygon([(8, 10), (24, 10), (27, 28), (5, 28)], fill=col, outline=dark); d.rectangle((10, 6, 22, 10), fill=dark)
    elif shape == "block": d.polygon([(5, 14), (16, 8), (27, 14), (27, 24), (16, 29), (5, 24)], fill=col, outline=dark); d.line((5, 14, 16, 19, 27, 14), fill=dark); d.line((16, 19, 16, 29), fill=dark)
    elif shape == "jar": d.rounded_rectangle((8, 9, 24, 28), 3, fill=col, outline=(60, 60, 70, 255), width=2); d.rectangle((9, 5, 23, 9), fill=(150, 110, 70, 255))
    elif shape == "bowl": d.chord((4, 6, 28, 28), 0, 180, fill=(150, 100, 60, 255)); d.ellipse((5, 9, 27, 18), fill=col)
    elif shape == "bottle": d.rounded_rectangle((10, 11, 22, 29), 3, fill=col, outline=(60, 60, 70, 255), width=2); d.rectangle((13, 4, 19, 11), fill=(200, 220, 230, 255), outline=(60, 60, 70, 255))
    elif shape == "cup": d.rounded_rectangle((7, 10, 22, 28), 3, fill=(240, 236, 228, 255), outline=(90, 80, 70, 255), width=2); d.rectangle((9, 11, 20, 15), fill=col); d.arc((19, 13, 28, 23), -90, 90, fill=(90, 80, 70, 255), width=2)
    return img

def parse_list(text, names):
    """'パン1・ハチミツ1' -> [[id, 1], ...]; unknown names raise (so the catalogue and the map stay in step)."""
    out = []
    for part in re.split("[・、]", text):
        part = part.strip()
        if not part: continue
        m = re.match(r"(.+?)(\d+)(（.*）)?$", part)
        if not m: raise ValueError("cannot read ingredient: " + part)
        name, n = m.group(1).strip(), int(m.group(2))
        if name not in names: raise ValueError("unknown ingredient: " + name)
        out.append([names[name], n])
    return out

def main():
    cat = json.load(open(os.path.join(SRC, "catalogue.json"), encoding="utf8"))
    names = dict(VANILLA)
    for e in cat: names[e["name"]] = "cooptown:" + e["id"]
    entries = []
    for e in cat:
        cid = "cooptown:" + e["id"]
        kind = "material" if e["category"] in ("中間素材", "新食材") else "container" if e["category"] == "容器" else "drink" if e["category"] == "飲み物" else "food"
        text = e.get("ingredients") or ""
        ing, out, ret, buy, note = [], 1, [], False, ""
        if e["category"] == "新食材":
            buy = True  # new ingredients: bought from the shop for now (growing them is a later addition)
        elif e["id"] == "cup":
            pass
        elif "→" in text:  # intermediate: 'A2・B1→X2／process. 空瓶1返却'
            left, right = text.split("→", 1)
            ing = parse_list(left, names)
            m = re.match(r"(.+?)(\d+)", right); out = int(m.group(2))
            note = right.split("／", 1)[1] if "／" in right else ""
            if "空瓶1返却" in note: ret.append([M("glass_bottle"), 1])
            if "空バケツ1返却" in note: ret.append([M("bucket"), 1])
        elif text:
            ing = parse_list(text, names)
        container = CONTAINERS.get(e.get("container") or "なし")
        if kind in ("food", "drink"):
            # honey / milk: the empty bottle / bucket comes back when cooking; a bottle of water used for a hot drink
            # (served in a cup) also gives its bottle back, a cold one becomes the drink's bottle
            for i, n in ing:
                if i in RETURN_ON_COOK: ret.append([RETURN_ON_COOK[i], n])
                if i == "water" and container != M("glass_bottle"): ret.append([M("glass_bottle"), n])
        station = e.get("station") or ("焚火（専用調理UI）" if kind == "material" and ing else None)
        if e["id"] == "cup": station = "作業台"; ing = [[M("brick"), 3]]
        entries.append({"id": cid, "name": e["name"], "cat": e["category"], "kind": kind, "h": e.get("qualityH"), "s": e.get("qualityS"),
                        "hours": e.get("hours") or 0, "station": station, "smoke": bool(station and "燻製機" in station), "tab": TABS.get(e["category"]),
                        "level": e.get("level") or 1, "ing": ing, "out": out, "ret": ret, "container": container, "buy": buy,
                        "hp": bool(e.get("effect") and "HP2" in e["effect"]), "note": note})
    # pictures and names
    out_dir = os.path.join(RP, "textures", "cooptown", "food"); os.makedirs(out_dir, exist_ok=True)
    tex = json.load(open(os.path.join(RP, "textures", "item_texture.json"), encoding="utf8"))
    items_dir = os.path.join(BP, "items", "food"); os.makedirs(items_dir, exist_ok=True)
    for e in entries:
        key = e["id"].split(":")[1]
        src = os.path.join(SRC, "textures", "items", "food", key + ".png")
        if os.path.exists(src): shutil.copy(src, os.path.join(out_dir, key + ".png"))
        else: standin(*STANDIN[key]).save(os.path.join(out_dir, key + ".png"))
        icon = "cooptown_food_" + key
        tex["texture_data"][icon] = {"textures": "textures/cooptown/food/" + key}
        comps = {"minecraft:display_name": {"value": e["name"]}, "minecraft:icon": {"textures": {"default": icon}},
                 "minecraft:max_stack_size": 16 if e["kind"] != "container" else 64}
        if e["kind"] in ("food", "drink"):
            food = {"nutrition": e["h"][0], "saturation_modifier": 0.6, "can_always_eat": e["kind"] == "drink"}
            if e["container"]: food["using_converts_to"] = e["container"]
            comps["minecraft:food"] = food
            comps["minecraft:use_modifiers"] = {"use_duration": 1.6, "movement_modifier": 0.35}
            comps["minecraft:use_animation"] = "drink" if e["kind"] == "drink" or e["container"] == M("bowl") else "eat"
        json.dump({"format_version": "1.21.90", "minecraft:item": {"description": {"identifier": e["id"], "menu_category": {"category": "items", "group": "minecraft:itemGroup.name.miscFood"}},
                   "components": comps}}, open(os.path.join(items_dir, key + ".json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    json.dump(tex, open(os.path.join(RP, "textures", "item_texture.json"), "w", encoding="utf8"), ensure_ascii=False, indent=2)
    # the old files of the two ids the catalogue takes over
    for old in ["trail_ration.json", "dish_milk_pudding.json"]:
        p = os.path.join(BP, "items", old)
        if os.path.exists(p): os.remove(p)
    body = json.dumps(entries, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(BP, "scripts", "food-catalog.js"), "w", encoding="utf8") as f:
        f.write("// Generated by CoopTown_RP/tools/build-food250.py from the food catalogue (Notion「食品250品・材料34品」). Do not edit.\n")
        f.write("// kind: food / drink / material / container. h, s: [通常, 良質, 極上]. ing: [[id, n]] ('water' = a bottle of water).\n")
        f.write("// ret: containers given back when cooking. out: how many one cooking makes. hp: the soup effect (HP 2 over 20 s out of combat).\n")
        f.write("export const FOOD_CATALOG=" + body + ";\n")
    print("foods:", sum(e["kind"] in ("food", "drink") for e in entries), "materials:", sum(e["kind"] == "material" for e in entries), "total:", len(entries))

if __name__ == "__main__":
    main()
