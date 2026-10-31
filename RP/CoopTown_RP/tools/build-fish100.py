"""Builds the 100 fish (fish set TID_Craftopia_Fish100_32px: catalogue.json + textures/items/fish/<id>.png, 32 x 32) into the addon.
Source: tools/assets/fish100/. Writes:
  BP scripts/fish-species.js  (species: where / when / bait / size / rank / price / vanilla base)
  BP items/fish/<id>.json     (cooptown:fish_<id>, raw fish food) and recipes/fish/<id>.json (furnace / smoker / campfire)
  RP textures/cooptown/fish/<id>.png and item_texture.json (cooptown_fish_<id>)
The where / when / bait / rank / size choices below are game balance, not biology.
Run: python tools/build-fish100.py   (from the CoopTown_RP folder)
"""
import json, os, shutil

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BP = os.path.join(os.path.dirname(os.path.dirname(RP)), "development_behavior_packs", "CoopTown_BP")
SRC = os.path.join(RP, "tools", "assets", "fish100")

# biome id patterns (Bedrock ids)
RIVER = "river|swamp|plains|forest|meadow|cherry|birch|mangrove"
COLD_RIVER = "taiga|frozen|cold|ice|grove|snowy|river"
SEA = "ocean|beach|stony_shore|stone_beach"
COLD_SEA = "cold_ocean|frozen_ocean|frozen_river"
WARM = "warm_ocean|lukewarm|beach|mangrove"
FRESH_TROPIC = "jungle|mangrove|swamp"
DEEP = "deep"
# category defaults: where, bait
CAT = {"川・湖": (RIVER, "seeds"), "海・沿岸": (SEA, None), "沖合・回遊": ("ocean", "worm"), "熱帯・サンゴ礁": (WARM, "berry"), "深海・大物": (DEEP, "eye")}
LEGEND = {"itoh", "nishikigoi", "kuromaguro", "mekajiki", "manbo", "napoleon", "pirarucu", "oarfish", "coelacanth", "whale_shark", "great_white"}
RARE = set("""iwana amago unagi namazu wakasagi madai ishidai hirame torafugu buri kanpachi hiramasa katsuo kihada mebachi bincho kajiki
benizake masunosuke mandarinfish lionfish moorish_idol royal_gramma banggai arowana discus seahorse piranha anglerfish barreleye viperfish
gulper_eel kinmedai sturgeon paddlefish gar electric_eel hammerhead manta sawshark""".split())
NIGHT = set("namazu unagi dojo tachiuo mebaru kasago anglerfish viperfish lanternfish barreleye gulper_eel oarfish itoh kinmedai great_white coelacanth electric_eel".split())
DAY = set("manbo kuromaguro mekajiki napoleon nishikigoi whale_shark tobiuo shiira kingyo medaka".split())
WHERE = {  # overrides
    "yamame": COLD_RIVER, "iwana": COLD_RIVER, "amago": COLD_RIVER, "itoh": "frozen|cold|taiga|ice", "wakasagi": "frozen|ice|cold|taiga",
    "nishikigoi": "cherry|flower", "kingyo": "plains|cherry|flower|meadow", "medaka": "plains|swamp|meadow|cherry",
    "sake": COLD_SEA + "|river", "benizake": COLD_SEA + "|river", "ginzake": COLD_SEA + "|river", "masunosuke": COLD_SEA,
    "kuromaguro": "deep_ocean|deep_lukewarm|ocean", "manbo": "ocean|lukewarm",
    "betta": FRESH_TROPIC, "guppy": FRESH_TROPIC, "neon_tetra": FRESH_TROPIC, "discus": FRESH_TROPIC, "angelfish": FRESH_TROPIC,
    "arowana": FRESH_TROPIC, "pirarucu": "jungle", "piranha": FRESH_TROPIC, "napoleon": "warm_ocean|deep_lukewarm",
    "sturgeon": "river|cold|taiga", "paddlefish": "river|swamp", "gar": "swamp|mangrove|river", "electric_eel": "jungle|swamp",
    "whale_shark": "warm_ocean|lukewarm|deep_lukewarm", "hammerhead": "warm_ocean|lukewarm|ocean", "great_white": "ocean|deep",
    "manta": "warm_ocean|lukewarm|deep_lukewarm",
}
BAIT = {"black_bass": "worm", "namazu": "worm", "unagi": "worm", "dojo": "worm", "piranha": "worm", "arowana": "worm", "pirarucu": "worm",
        "gar": "worm", "sturgeon": "worm", "kingyo": "berry", "nishikigoi": "berry", "medaka": "seeds", "torafugu": "eye", "hirame": "eye",
        "kasago": "worm", "mebaru": "worm", "tachiuo": "worm", "aji": "seeds", "iwashi": "seeds", "sanma": "seeds", "whale_shark": "eye"}
SIZE = {  # cm
    "ayu": (15, 30), "yamame": (15, 30), "iwana": (20, 45), "nijimasu": (25, 60), "amago": (15, 30), "ugui": (15, 35), "oikawa": (10, 18),
    "kawamutsu": (10, 20), "koi": (30, 90), "ginbuna": (10, 30), "kingyo": (5, 20), "nishikigoi": (50, 100), "medaka": (2, 4), "dojo": (8, 18),
    "namazu": (40, 110), "unagi": (40, 100), "wakasagi": (8, 15), "black_bass": (25, 60), "bluegill": (10, 25), "itoh": (100, 160),
    "aji": (15, 40), "saba": (25, 50), "iwashi": (10, 25), "sanma": (25, 40), "sayori": (20, 40), "kisu": (15, 30), "suzuki": (40, 100),
    "kurodai": (25, 50), "madai": (30, 90), "ishidai": (30, 70), "mebaru": (15, 30), "kasago": (15, 30), "ainame": (20, 50), "bora": (30, 80),
    "hirame": (40, 100), "karei": (20, 50), "kawahagi": (15, 30), "umazurahagi": (20, 40), "torafugu": (30, 70), "hako_fugu": (10, 25),
    "buri": (60, 120), "kanpachi": (60, 150), "hiramasa": (60, 150), "katsuo": (40, 90), "kuromaguro": (150, 300), "kihada": (80, 200),
    "mebachi": (80, 200), "bincho": (60, 120), "shiira": (60, 150), "tobiuo": (20, 40), "kajiki": (150, 350), "mekajiki": (200, 450),
    "tachiuo": (60, 150), "sawara": (50, 100), "sake": (50, 90), "benizake": (50, 80), "ginzake": (50, 80), "masunosuke": (70, 150),
    "manbo": (100, 330), "rainbow_runner": (50, 120),
    "clownfish": (6, 12), "blue_tang": (15, 30), "yellow_tang": (12, 20), "butterflyfish": (10, 20), "moorish_idol": (15, 25),
    "mandarinfish": (4, 8), "lionfish": (20, 40), "parrotfish": (30, 90), "napoleon": (100, 230), "royal_gramma": (5, 8), "banggai": (6, 8),
    "betta": (5, 7), "guppy": (3, 6), "neon_tetra": (2, 4), "discus": (12, 20), "angelfish": (10, 15), "arowana": (60, 120),
    "pirarucu": (200, 400), "piranha": (15, 35), "seahorse": (5, 25),
    "anglerfish": (20, 100), "oarfish": (300, 800), "coelacanth": (120, 200), "barreleye": (10, 15), "viperfish": (20, 35),
    "gulper_eel": (50, 100), "lanternfish": (5, 15), "orange_roughy": (30, 75), "kinmedai": (25, 50), "gindara": (50, 100),
    "pinecone_fish": (10, 15), "sturgeon": (100, 300), "paddlefish": (100, 220), "gar": (100, 300), "electric_eel": (100, 250),
    "whale_shark": (600, 1200), "hammerhead": (200, 450), "great_white": (300, 600), "manta": (300, 700), "sawshark": (80, 150)}
SALMON = set("ayu yamame iwana nijimasu amago itoh wakasagi sake benizake ginzake masunosuke".split())
PUFFER = set("torafugu hako_fugu lionfish".split())
PRICE = [10, 35, 180]

def main():
    cat = json.load(open(os.path.join(SRC, "catalogue.json"), encoding="utf8"))
    species = []
    tex_dir = os.path.join(RP, "textures", "cooptown", "fish"); os.makedirs(tex_dir, exist_ok=True)
    items_dir = os.path.join(BP, "items", "fish"); os.makedirs(items_dir, exist_ok=True)
    rec_dir = os.path.join(BP, "recipes", "fish"); os.makedirs(rec_dir, exist_ok=True)
    tex = json.load(open(os.path.join(RP, "textures", "item_texture.json"), encoding="utf8"))
    for e in cat:
        k, name, c = e["id"], e["name"], e["category"]
        assert k in SIZE, k
        where, bait = CAT[c]
        rank = 2 if k in LEGEND else 1 if k in RARE else 0
        base = "minecraft:salmon" if k in SALMON else "minecraft:pufferfish" if k in PUFFER else "minecraft:tropical_fish" if c == "熱帯・サンゴ礁" else "minecraft:cod"
        item = "cooptown:fish_" + k
        species.append({"id": item, "name": name, "cat": c, "rank": rank, "where": WHERE.get(k, where),
                        "time": "night" if k in NIGHT else "day" if k in DAY else None, "bait": BAIT.get(k, bait),
                        "size": list(SIZE[k]), "price": PRICE[rank], "base": base})
        shutil.copy(os.path.join(SRC, "textures", "items", "fish", k + ".png"), os.path.join(tex_dir, k + ".png"))
        icon = "cooptown_fish_" + k
        tex["texture_data"][icon] = {"textures": "textures/cooptown/fish/" + k}
        cooked = "minecraft:cooked_salmon" if base == "minecraft:salmon" else "minecraft:cooked_cod"
        comps = {"minecraft:display_name": {"value": name}, "minecraft:icon": {"textures": {"default": icon}}, "minecraft:max_stack_size": 64,
                 "minecraft:food": {"nutrition": 2, "saturation_modifier": 0.1, "can_always_eat": False},
                 "minecraft:use_modifiers": {"use_duration": 1.6, "movement_modifier": 0.35}, "minecraft:use_animation": "eat",
                 "minecraft:tags": {"tags": ["minecraft:is_fish", "cooptown:fish"]}}
        json.dump({"format_version": "1.21.90", "minecraft:item": {"description": {"identifier": item,
                   "menu_category": {"category": "items", "group": "minecraft:itemGroup.name.miscFood"}}, "components": comps}},
                  open(os.path.join(items_dir, k + ".json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
        # pufferfish-like fish are not cooked (as in vanilla)
        if base != "minecraft:pufferfish" and base != "minecraft:tropical_fish":
            json.dump({"format_version": "1.20.10", "minecraft:recipe_furnace": {"description": {"identifier": "cooptown:cook_fish_" + k},
                       "tags": ["furnace", "smoker", "campfire", "soul_campfire"], "input": item, "output": cooked}},
                      open(os.path.join(rec_dir, k + ".json"), "w", encoding="utf8"), indent=1)
    json.dump(tex, open(os.path.join(RP, "textures", "item_texture.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    with open(os.path.join(BP, "scripts", "fish-species.js"), "w", encoding="utf8", newline="\n") as f:
        f.write("// Generated by CoopTown_RP/tools/build-fish100.py from the fish set (100 species). Do not edit.\n")
        f.write("// rank: 0 common, 1 rare, 2 legendary. where: biome id pattern. time: 'day' / 'night' / null. bait: the bait it likes.\n")
        f.write("// size: cm range. price: town buying price (通常). base: the vanilla fish it counts as in recipes.\n")
        f.write("export const FISH_SPECIES=" + json.dumps(species, ensure_ascii=False) + ";\n")
    print("fish:", len(species), "rare:", sum(s["rank"] == 1 for s in species), "legend:", sum(s["rank"] == 2 for s in species))

main()
