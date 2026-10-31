"""Builds item icons for the HUD log.

Reads vanilla textures straight from the installed game (.brarchive files) and writes one 32px icon
per item to textures/cooptown/items/<name>.png (leather/leaves tinted, animated strips cut to one
frame), plus the item -> icon map to the BP as scripts/item-icons.js.

Run from the CoopTown_RP folder:  python tools/build-item-icons.py
The item list lives in tools/icon-items.json.
"""
import io, json, os, struct, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from map_tiles import build_map_glyphs, write_map_textures

GAME = os.path.join("C:" + os.sep, "XboxGames", "Minecraft for Windows", "Content", "data", "resource_packs")
RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BP_SCRIPTS = os.path.join(RP, "..", "..", "development_behavior_packs", "CoopTown_BP", "scripts")
CELL = 32

def read_archive(path):
    data = open(path, "rb").read()
    count = struct.unpack_from("<I", data, 8)[0]
    base = 16 + count * 256
    files = {}
    for i in range(count):
        o = 16 + i * 256
        name = data[o + 1:o + 1 + data[o]].decode("utf8")
        off, size = struct.unpack_from("<II", data, o + 248)
        files[name] = data[base + off:base + off + size]
    return files

def load_vanilla():
    """Textures from vanilla and every versioned vanilla_x.y pack; newer packs win."""
    def version(name):
        parts = name.split("_", 1)[1].split(".") if "_" in name else []
        return tuple(int(p) if p.isdigit() else 0 for p in parts)
    packs = sorted((d for d in os.listdir(GAME) if d == "vanilla" or (d.startswith("vanilla_") and d[8:9].isdigit())), key=lambda d: (d != "vanilla", version(d)))
    items, blocks = {}, {}
    for pack in packs:
        tex = os.path.join(GAME, pack, "__brarchive", "textures")
        if not os.path.isdir(tex):
            continue
        for name, target in (("items.brarchive", items), ("blocks.brarchive", blocks)):
            if os.path.exists(os.path.join(tex, name)):
                target.update(read_archive(os.path.join(tex, name)))
        sub = os.path.join(tex, "blocks")
        if os.path.isdir(sub):
            for f in os.listdir(sub):
                if f.endswith(".brarchive"):
                    prefix = f[:-len(".brarchive")] + "/"
                    blocks.update({prefix + k: v for k, v in read_archive(os.path.join(sub, f)).items()})
    return items, blocks

ITEMS, BLOCKS = load_vanilla()

# id (without "minecraft:") -> texture name, when the vanilla file name differs
ALIAS = {
    "cod": "fish_raw", "cooked_cod": "fish_cooked", "redstone": "redstone_dust", "glass_bottle": "potion_bottle_empty", "torch": "torch_on", "salmon": "fish_salmon_raw", "cooked_salmon": "fish_salmon_cooked",
    "tropical_fish": "fish_clownfish_raw", "pufferfish": "fish_pufferfish_raw", "beef": "beef_raw", "cooked_beef": "beef_cooked",
    "porkchop": "porkchop_raw", "cooked_porkchop": "porkchop_cooked", "chicken": "chicken_raw", "cooked_chicken": "chicken_cooked",
    "mutton": "mutton_raw", "cooked_mutton": "mutton_cooked", "rabbit": "rabbit_raw", "cooked_rabbit": "rabbit_cooked",
    "wheat_seeds": "seeds_wheat", "beetroot_seeds": "seeds_beetroot", "pumpkin_seeds": "seeds_pumpkin", "melon_seeds": "seeds_melon",
    "melon_slice": "melon", "cocoa_beans": "dye_powder_brown", "ink_sac": "dye_powder_black", "bone_meal": "dye_powder_white",
    "lapis_lazuli": "dye_powder_blue", "glow_berries": "glow_berries", "golden_apple": "apple_golden", "golden_carrot": "carrot_golden",
    "baked_potato": "potato_baked", "poisonous_potato": "potato_poisonous", "slime_ball": "slimeball", "clay_ball": "clay_ball",
    "experience_bottle": "experience_bottle", "honey_bottle": "honey_bottle", "glow_ink_sac": "dye_powder_glow", "name_tag": "name_tag",
    "lead": "lead", "bow": "bow_standby", "fishing_rod": "fishing_rod_uncast", "bucket": "bucket_empty", "milk_bucket": "bucket_milk",
    "bed": "bed_white", "frame": "item_frame", "compass": "compass_item", "clock": "clock_item", "minecart": "minecart_normal",
    "iron_door": "door_iron", "wooden_door": "door_wood", "cake": "cake", "book": "book_normal", "brewing_stand": "brewing_stand",
    "cauldron": "cauldron", "hopper": "hopper", "repeater": "repeater", "comparator": "comparator", "campfire": "campfire",
    "armor_stand": "armor_stand", "nether_wart": "nether_wart", "sugar_cane": "reeds", "sweet_berries": "sweet_berries",
    "raw_iron": "raw_iron", "raw_copper": "raw_copper", "raw_gold": "raw_gold", "quartz": "quartz", "netherite_scrap": "netherite_scrap",
    "totem_of_undying": "totem", "nautilus_shell": "nautilus", "mushroom_stew": "mushroom_stew", "snowball": "snowball", "honeycomb": "honeycomb",
    "oak_sign": "sign", "spruce_sign": "sign_spruce", "birch_sign": "sign_birch", "jungle_sign": "sign_jungle", "acacia_sign": "sign_acacia",
    "dark_oak_sign": "sign_darkoak", "crimson_sign": "sign_crimson", "warped_sign": "sign_warped",
    "oak_boat": "boat_oak", "spruce_boat": "boat_spruce", "birch_boat": "boat_birch", "jungle_boat": "boat_jungle", "acacia_boat": "boat_acacia", "dark_oak_boat": "boat_darkoak",
    "spruce_door": "door_spruce", "birch_door": "door_birch", "jungle_door": "door_jungle", "acacia_door": "door_acacia", "dark_oak_door": "door_dark_oak",
}
WOOD_BLOCK = {"oak": "planks_oak", "spruce": "planks_spruce", "birch": "planks_birch", "jungle": "planks_jungle", "acacia": "planks_acacia", "dark_oak": "planks_big_oak",
              "mangrove": "mangrove_planks", "cherry": "cherry_planks", "pale_oak": "pale_oak_planks", "bamboo": "bamboo_planks", "crimson": "crimson_planks", "warped": "warped_planks"}
LOG_BLOCK = {"oak": "log_oak", "spruce": "log_spruce", "birch": "log_birch", "jungle": "log_jungle", "acacia": "log_acacia", "dark_oak": "log_big_oak",
             "mangrove": "mangrove_log_side", "cherry": "cherry_log_side", "pale_oak": "pale_oak_log_side", "crimson": "crimson_log_side", "warped": "warped_stem_side"}
BLOCK_ALIAS = {
    "grass_block": "grass_side_carried", "redstone_torch": "redstone_torch_on", "torch": "torch_on", "melon_block": "melon_side", "pumpkin": "pumpkin_side", "cactus": "cactus_side", "bamboo": "bamboo_stem",
    "chest": "chest_front", "furnace": "furnace_front_off", "smoker": "smoker_front_off", "blast_furnace": "blast_furnace_front_off",
    "dispenser": "dispenser_front_horizontal", "dropper": "dropper_front_horizontal", "observer": "observer_front", "piston": "piston_side",
    "stonecutter_block": "stonecutter2_side", "anvil": "anvil_top_damaged_0", "smithing_table": "smithing_table_front", "barrel": "barrel_side",
    "cartography_table": "cartography_table_side1", "composter": "composter_side", "enchanting_table": "enchanting_table_top",
    "crafting_table": "crafting_table_front", "rail": "rail_normal", "golden_rail": "rail_golden", "glass_pane": "glass", "stone_stairs": "cobblestone",
    "cobblestone_slab": "cobblestone", "cobblestone_wall": "cobblestone", "smooth_stone_slab": "stone_slab_top", "smooth_stone": "stone_slab_top",
    "white_wool": "wool_colored_white", "deepslate": "deepslate/deepslate", "cobbled_deepslate": "deepslate/cobbled_deepslate", "tuff": "tuff",
    "end_stone": "end_stone", "netherrack": "netherrack", "blackstone": "blackstone", "amethyst_cluster": "amethyst_cluster", "ancient_debris": "ancient_debris_side",
    "granite": "stone_granite", "diorite": "stone_diorite", "andesite": "stone_andesite", "calcite": "calcite", "iron_bars": "iron_bars",
    "dandelion": "flower_dandelion", "yellow_flower": "flower_dandelion", "poppy": "flower_rose", "red_flower": "flower_rose", "blue_orchid": "flower_blue_orchid",
    "allium": "flower_allium", "azure_bluet": "flower_houstonia", "red_tulip": "flower_tulip_red", "orange_tulip": "flower_tulip_orange",
    "white_tulip": "flower_tulip_white", "pink_tulip": "flower_tulip_pink", "oxeye_daisy": "flower_oxeye_daisy", "cornflower": "flower_cornflower",
    "lily_of_the_valley": "flower_lily_of_the_valley", "torchflower": "torchflower", "pink_petals": "pink_petals", "sunflower": "double_plant_sunflower_front",
    "lilac": "double_plant_syringa_top", "rose_bush": "double_plant_rose_top", "peony": "double_plant_paeonia_top",
    "brown_mushroom": "mushroom_brown", "red_mushroom": "mushroom_red", "crimson_fungus": "crimson_fungus", "warped_fungus": "warped_fungus",
    "oak_sapling": "sapling_oak", "spruce_sapling": "sapling_spruce", "birch_sapling": "sapling_birch", "jungle_sapling": "sapling_jungle",
    "acacia_sapling": "sapling_acacia", "dark_oak_sapling": "sapling_roofed_oak", "cherry_sapling": "cherry_sapling", "pale_oak_sapling": "pale_oak_sapling",
    "sapling": "sapling_oak", "mangrove_propagule": "mangrove_propagule", "oak_leaves": "leaves_oak_carried", "wheat": "wheat_stage_7",
    "carrots": "carrots_stage_3", "potatoes": "potatoes_stage_3", "beetroot": "beetroots_stage_3", "cocoa": "cocoa_stage_2",
    "sweet_berry_bush": "sweet_berry_bush_stage3", "cave_vines_body_with_berries": "cave_vines_body_berries", "cave_vines_head_with_berries": "cave_vines_head_berries",
    "trapdoor": "trapdoor", "fence_gate": "planks_oak", "ladder": "ladder", "bookshelf": "bookshelf", "hay_block": "hay_block_side", "coal_block": "coal_block",
    "iron_block": "iron_block", "gold_block": "gold_block", "diamond_block": "diamond_block", "emerald_block": "emerald_block", "obsidian": "obsidian",
    "clay": "clay", "sand": "sand", "red_sand": "red_sand", "gravel": "gravel", "dirt": "dirt", "stone": "stone", "cobblestone": "cobblestone", "ice": "ice",
}
TINT = {"leather_": (167, 105, 66), "_leaves": (72, 181, 24), "grass_block": None}
COLORS = ["white", "orange", "magenta", "light_blue", "yellow", "lime", "pink", "gray", "light_gray", "cyan", "purple", "blue", "brown", "green", "red", "black"]
WOOL_NAME = {"light_gray": "silver"}

def find(files, name):
    for ext in (".png", ".tga"):
        if name + ext in files:
            return files[name + ext]
    for ext in (".png", ".tga"):  # textures kept in a subfolder archive, e.g. huge_fungus/crimson_planks
        for key, data in files.items():
            if key.endswith("/" + name + ext):
                return data
    return None

def texture(item):
    ns, name = item.split(":", 1)
    if ns == "cooptown":
        mapping = json.load(open(os.path.join(RP, "textures", "item_texture.json"), encoding="utf8"))["texture_data"]
        entry = mapping.get("cooptown_" + name)
        if entry:
            tex = entry["textures"]
            if tex.startswith("textures/cooptown/"):
                return open(os.path.join(RP, tex + ".png"), "rb").read()
            return find(ITEMS, tex.rsplit("/", 1)[1])
        return None
    names = [ALIAS.get(name, name), name.replace("wooden_", "wood_").replace("golden_", "gold_")]
    for n in names:
        data = find(ITEMS, n)
        if data:
            return data
    if name.endswith("_wool"):
        color = name[:-5]
        return find(BLOCKS, "wool_colored_" + WOOL_NAME.get(color, color))
    for wood, block in WOOD_BLOCK.items():
        if name.startswith(wood + "_") and name[len(wood) + 1:] in ("planks", "stairs", "slab", "fence", "fence_gate", "trapdoor", "door", "sign", "boat"):
            if name.endswith("_door"):
                data = find(ITEMS, wood + "_door") or find(ITEMS, "door_" + wood)
                if data:
                    return data
            if name.endswith("_sign"):
                data = find(ITEMS, wood + "_sign") or find(ITEMS, "sign_" + wood)
                if data:
                    return data
            if name.endswith("_boat"):
                data = find(ITEMS, wood + "_boat") or find(ITEMS, "boat_" + wood)
                if data:
                    return data
            return find(BLOCKS, block)
    for wood, block in LOG_BLOCK.items():
        if name in (wood + "_log", wood + "_stem"):
            return find(BLOCKS, block)
    for n in (BLOCK_ALIAS.get(name, name), name + "_side", name + "_front", name + "_top"):
        data = find(BLOCKS, n)
        if data:
            return data
    return None

def icon(item, data):
    im = Image.open(io.BytesIO(data)).convert("RGBA")
    w, h = im.size
    if h > w:  # animated strip: first frame
        im = im.crop((0, 0, w, w))
    name = item.split(":", 1)[1]
    for key, color in TINT.items():
        if key in name and color:
            r, g, b, a = im.split()
            gray = Image.merge("RGB", (r, g, b)).convert("L")
            tinted = Image.merge("RGBA", [gray.point(lambda v, c=c: v * c // 255) for c in color] + [a])
            im = tinted
    return im.resize((CELL, CELL), Image.NEAREST)

def main():
    items = json.load(open(os.path.join(RP, "tools", "icon-items.json"), encoding="utf8"))
    out_dir = os.path.join(RP, "textures", "cooptown", "items")
    os.makedirs(out_dir, exist_ok=True)
    icons, missing = {}, []
    for item in items:
        data = texture(item)
        if not data:
            missing.append(item)
            continue
        name = item.replace("minecraft:", "").replace(":", "_")
        icon(item, data).save(os.path.join(out_dir, name + ".png"))
        icons[item] = name
    body = ",\n".join("  %s: %s" % (json.dumps(k), json.dumps(v)) for k, v in icons.items())
    with open(os.path.join(BP_SCRIPTS, "item-icons.js"), "w", encoding="utf8") as f:
        f.write("// Generated by CoopTown_RP/tools/build-item-icons.py. Item id -> textures/cooptown/items/<name>.png\n")
        f.write("export const ITEM_ICONS = {\n" + body + "\n};\n")
    # job icons for chat names (BP chat-runtime.js): the book's job pictures as "cooptown:job_<key>" text icons
    for key in ("miner", "farmer", "blacksmith", "cook", "enchanter", "fisher", "alchemist", "compass", "logger"):
        Image.open(os.path.join(RP, "textures", "cooptown", "book", "icons", key + ".png")).convert("RGBA").save(os.path.join(out_dir, "job_" + key + ".png"))
        icons["cooptown:job_" + key] = "job_" + key
    print("icons:", len(icons))
    if missing:
        print("no texture:", " ".join(missing))
    build_glyphs(icons, out_dir)

# Text icons: the game only loads glyph pages it already ships (E0, E1, ...), so the icons go into
# the empty cells of the vanilla E1 and E0 pages; the vanilla glyphs in those pages are kept.
# Measured in game: a glyph pixel is drawn at a fixed screen size (no scaling to the text), and the
# vertical middle of a cell sits on the middle of the text line.
GLYPH_PAGES = ("E1", "E0")
MAP_PAGE = "E0"  # minimap glyphs (tools/map_tiles.py) go here first
GLYPH_ICON_SIZE = 8  # glyph pixels; about 1.5x the text height on screen
GLYPH_ICON_GAP = 2   # glyph pixels of space between the icon and the next character
WOOD_VARIANT = ("_stairs","_slab", "_fence", "_fence_gate", "_door", "_trapdoor", "_sign", "_boat", "_raft")

def glyph_priority(item):
    name = item.split(":", 1)[1]
    if item.startswith("cooptown:"):
        return -1  # CoopTown's own items (job specials) always get an icon
    if any(name.endswith(s) for s in WOOD_VARIANT) and not name.startswith("oak_"):
        return 1  # building variants of other woods: last, may not fit
    return 0

def build_glyphs(icons, icon_dir):
    font = read_archive(os.path.join(GAME, "vanilla", "__brarchive", "font.brarchive"))
    order = sorted(icons, key=glyph_priority)
    glyphs, pages, map_glyphs = {}, {}, {}
    map_order, map_missing = build_map_glyphs(find, BLOCKS, os.path.join(RP, "textures", "cooptown", "map"))
    # hidden marks (token:) are plain characters, so they can live on the other page; only the map's tiles and
    # markers must share one page (E0) to line up. Marks go first on E1.
    token_order = [g for g in map_order if g[0].startswith("token:")]
    map_order = [g for g in map_order if not g[0].startswith("token:")]
    for page in GLYPH_PAGES:
        im = Image.open(io.BytesIO(font["glyph_%s.png" % page])).convert("RGBA")  # native size
        cell = im.size[0] // 16
        pages[page] = im
        for index in range(256):
            if not order:
                break
            box = ((index % 16) * cell, (index // 16) * cell, (index % 16) * cell + cell, (index // 16) * cell + cell)
            if index == 0 or im.crop(box).getbbox():
                continue  # used by vanilla (cell 0 left empty on purpose)
            if page != MAP_PAGE and token_order:
                key, tile = token_order.pop(0)
                im.paste(tile, (box[0], box[1] + (cell - tile.size[1]) // 2))
                map_glyphs[key] = chr((int(page, 16) << 8) | index)
                continue
            if page == MAP_PAGE and map_order:
                # minimap glyphs first, all on one page so the map grid lines up
                key, tile = map_order.pop(0)
                y = box[1] + (cell - tile.size[1]) // 2
                if key.startswith("tile:") and key != "tile:blank":
                    # the game blends glyph edges with the pixels around them: give the empty part of the
                    # cell the tile's colours (fully transparent) so the edge doesn't fade to black
                    bleed = tile.resize((cell, cell), Image.NEAREST)
                    bleed.putalpha(0)
                    im.paste(bleed, box[:2])
                    edge = tile.crop((tile.size[0] - 1, 0, tile.size[0], tile.size[1])).resize((cell - tile.size[0], tile.size[1]), Image.NEAREST)
                    edge.putalpha(0)
                    im.paste(edge, (box[0] + tile.size[0], y))
                im.paste(tile, (box[0], y))
                map_glyphs[key] = chr((int(page, 16) << 8) | index)
                continue
            item = order.pop(0)
            # Icon in the vertical middle of the cell; nearly invisible dots at the top and bottom keep
            # the glyph's full height so the game does not crop it and the icon stays on the text line.
            src = Image.open(os.path.join(icon_dir, icons[item] + ".png")).resize((GLYPH_ICON_SIZE, GLYPH_ICON_SIZE), Image.LANCZOS)
            x = box[0]
            im.paste(src, (x, box[1] + (cell - GLYPH_ICON_SIZE) // 2), src)
            # the dots sit GLYPH_ICON_GAP pixels right of the icon: the glyph is that much wider,
            # which leaves a small gap before the text that follows
            for y in (box[1], box[3] - 1):
                im.putpixel((x + GLYPH_ICON_SIZE - 1 + GLYPH_ICON_GAP, y), (255, 255, 255, 4))
            glyphs[item] = chr((int(page, 16) << 8) | index)
    os.makedirs(os.path.join(RP, "font"), exist_ok=True)
    for page, im in pages.items():
        im.save(os.path.join(RP, "font", "glyph_%s.png" % page))
    body = ",\n".join("  %s: %s" % (json.dumps(k), json.dumps(v)) for k, v in glyphs.items())
    with open(os.path.join(BP_SCRIPTS, "item-glyphs.js"), "w", encoding="utf8") as f:
        f.write("// Generated by CoopTown_RP/tools/build-item-icons.py. Item id -> icon character (font/glyph_E1.png, glyph_E0.png).\n")
        f.write("export const ITEM_GLYPHS = {\n" + body + "\n};\n")
    print("text icons:", len(glyphs), "not fitted:", " ".join(order) if order else "none")
    assert not map_order and not token_order, "minimap glyphs did not fit"
    body = ",\n".join("  %s: %s" % (json.dumps(k), json.dumps(v)) for k, v in map_glyphs.items())
    with open(os.path.join(BP_SCRIPTS, "map-glyphs.js"), "w", encoding="utf8") as f:
        f.write("// Generated by CoopTown_RP/tools/build-item-icons.py (tools/map_tiles.py). tile:/marker:/char: key -> character.\n")
        f.write("export const MAP_GLYPHS = {\n" + body + "\n};\n")
    print("map glyphs:", len(map_glyphs), "tiles without texture:", " ".join(map_missing) or "none")
    # the HUD generator (build-hud-log.mjs) needs the token characters too
    with open(os.path.join(RP, "tools", "map-glyphs.json"), "w", encoding="utf8") as f:
        json.dump({k: v for k, v in map_glyphs.items() if k.startswith("token:")}, f, ensure_ascii=False, indent=1)
    if not os.path.exists(os.path.join(RP, "tools", "assets", "minimap", "part_04.png")):
        write_map_textures(os.path.join(RP, "textures", "cooptown", "map"))  # drawn arrows/frames
    else:  # the user's sprites: arrows come from tools/import-minimap-assets.py; frames are still drawn
        arrows = [os.path.join(RP, "textures", "cooptown", "map", "arrow_%d.png" % i) for i in range(8)]
        saved = [open(a, "rb").read() for a in arrows]
        write_map_textures(os.path.join(RP, "textures", "cooptown", "map"))
        for a, data in zip(arrows, saved):
            open(a, "wb").write(data)

if __name__ == "__main__":
    sys.exit(main())
