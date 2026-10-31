"""Minimap glyphs: block-top tiles, markers and the small characters of the coordinate line.

Used by build-item-icons.py, which places them in glyph page E0 (all map glyphs on one page so
they line up) and writes the key -> character map to the BP as scripts/map-glyphs.js.
"""
import io
from PIL import Image, ImageDraw, ImageFont

TILE = 10  # glyph pixels of picture per map cell
PAD = 1    # copied edge pixels around each tile: the game blends glyph edges with the
           # neighbouring (transparent) cell, which showed as thin lines between tiles
CELL = TILE + PAD * 2
# The game leaves ~3 glyph pixels between characters but none between lines, so tiles are drawn
# narrower than they are tall; with the gap they come out square on screen.
TILE_W = 7
BLANK_DOT_ALPHA = 24  # raise again if the round map's rows collapse (left edge turns flat)
CELL_W = TILE_W + PAD * 2

def _padded(im):
    """Tile with its edge pixels repeated PAD times on every side."""
    w = im.size[0]
    out = Image.new("RGBA", (w + PAD * 2, CELL))
    out.paste(im, (PAD, PAD))
    for i in range(PAD):
        out.paste(im.crop((0, 0, 1, TILE)), (i, PAD)); out.paste(im.crop((w - 1, 0, w, TILE)), (w + PAD * 2 - 1 - i, PAD))
    for i in range(PAD):
        out.paste(out.crop((0, PAD, w + PAD * 2, PAD + 1)), (0, i)); out.paste(out.crop((0, CELL - PAD - 1, w + PAD * 2, CELL - PAD)), (0, CELL - 1 - i))
    return out

# key: (vanilla block texture, tint or None). Grass/leaves/water textures are grey in the game.
TILES = {
    "void": None, "grass": ("grass_top", (124, 189, 107)), "water": ("water_still_grey", (63, 118, 228)), "lava": ("lava_still", None),
    "sand": ("sand", None), "red_sand": ("red_sand", None), "gravel": ("gravel", None), "stone": ("stone", None),
    "cobblestone": ("cobblestone", None), "mossy": ("cobblestone_mossy", None), "deepslate": ("deepslate_top", None),
    "dirt": ("dirt", None), "coarse_dirt": ("coarse_dirt", None), "podzol": ("dirt_podzol_top", None), "mycelium": ("mycelium_top", None),
    "mud": ("mud", None), "clay": ("clay", None), "snow": ("snow", None), "ice": ("ice", None), "packed_ice": ("ice_packed", None),
    "log": ("log_oak_top", None), "log_spruce": ("log_spruce_top", None), "log_birch": ("log_birch_top", None), "log_dark": ("log_big_oak_top", None),
    "leaves": ("leaves_oak", (59, 140, 30)), "leaves_spruce": ("leaves_spruce", (97, 153, 97)), "leaves_birch": ("leaves_birch", (128, 167, 85)),
    "leaves_jungle": ("leaves_jungle", (48, 187, 11)), "cherry_leaves": ("cherry_leaves", None), "azalea": ("azalea_leaves", None),
    "planks": ("planks_oak", None), "planks_spruce": ("planks_spruce", None), "planks_birch": ("planks_birch", None), "planks_dark": ("planks_big_oak", None),
    "stone_bricks": ("stonebrick", None), "bricks": ("brick", None), "sandstone": ("sandstone_top", None), "red_sandstone": ("red_sandstone_top", None),
    "terracotta": ("hardened_clay", None), "wool": ("wool_colored_white", None), "glass": ("glass", None), "path": ("grass_path_top", None),
    "farmland": ("farmland_wet", None), "crops": ("wheat_stage_7", None), "moss": ("moss_block", None), "hay": ("hay_block_top", None),
    "pumpkin": ("pumpkin_top", None), "melon": ("melon_top", None), "cactus": ("cactus_top", None),
    "netherrack": ("netherrack", None), "soul_sand": ("soul_sand", None), "soul_soil": ("soul_soil", None), "basalt": ("basalt_top", None),
    "blackstone": ("blackstone_top", None), "crimson": ("crimson_nylium_top", None), "warped": ("warped_nylium_top", None),
    "wart_block": ("nether_wart_block", None), "glowstone": ("glowstone", None), "end_stone": ("end_stone", None), "obsidian": ("obsidian", None),
    "bedrock": ("bedrock", None), "quartz": ("quartz_block_top", None), "iron_block": ("iron_block", None), "tuff": ("tuff", None), "calcite": ("calcite", None),
}
MARKERS = ["player", "base", "landmark", "landmark_found", "event"]
# Invisible 1-dot glyphs appended to the map text; the HUD looks for them to pick the arrow
# direction (dir0-7, 0 = north, clockwise) and the round frame.
TOKENS = ["dir%d" % i for i in range(8)] + ["circle"] + ["size%d" % i for i in range(3)]  # size0-2 = 小/中/大
TOKENS += ["day", "night"]  # sun / moon next to the map
# hotbar numbers sent with the map text, one character per value (a two-character "mark + digit" check never
# matched in game): lh1 = level 100, lt0-9 / lo0-9 = level tens / ones, xp0-10 = XP in 10 % steps;
# "mapon" = the map itself is shown
# Each HUD picture checks one character of its own (no "or": an "or" never came out true in game):
# hb = numbers present, lp2 = show the tens place, bf<i> / bh<i> = lightning bolt i full / half
TOKENS += ["mapon", "hb", "lh1", "lp2"] + ["lt%d" % i for i in range(10)] + ["lo%d" % i for i in range(10)] + ["xp%d" % i for i in range(11)] + ["bf%d" % i for i in range(1, 11)] + ["bh%d" % i for i in range(1, 11)]
# top-left profile (also sent with the map text), as bits so it costs few font cells (each mark takes an item
# icon's place): pj0-2 = job number 1-7 (JOBS order, 0 = none), pt0-4 = title number 0-31 (PROFILE_TITLES in
# the BP's profile-config.js), ptx = wearing a title. The HUD checks all bits with "and" / "not" only.
TOKENS += ["pj%d" % i for i in range(3)] + ["pt%d" % i for i in range(5)] + ["ptx"]
# tracked quest panel: qx = a quest is tracked, qp0-4 = its progress in 5 % steps (0-20) as bits
TOKENS += ["qx"] + ["qp%d" % i for i in range(5)]
# HUD panels the player turned off in the book's settings: hp = profile, hw = money / bank, hq = quest, hl = location
TOKENS += ["hp", "hw", "hq", "hl"]
# the off-hand item for the hotbar's F box (Bedrock's off hand holds only these): os = shield, ot = totem, oa = arrow
TOKENS += ["os", "ot", "oa"]
# the profile's fourth job bit (8 jobs since 調合師 was split off 料理人); last, so the other marks keep their characters
TOKENS += ["pj3"]
# top notification bar (notify.js): nt1-4 = kind (お知らせ / 成功 / 注意 / エラー), nf0-5 = slide frame (5 = fully down)
TOKENS += ["nt%d" % i for i in range(1, 5)] + ["nf%d" % i for i in range(6)]
TEXT_FONT = r"C:\Windows\Fonts\consola.ttf"
KANJI_FONT = r"C:\Windows\Fonts\meiryob.ttc"

def _texture(find, blocks, name, tint):
    data = find(blocks, name)
    if not data:
        return None
    im = Image.open(io.BytesIO(data)).convert("RGBA")
    w, h = im.size
    if h > w:
        im = im.crop((0, 0, w, w))
    if tint:
        r, g, b, a = im.split()
        gray = Image.merge("RGB", (r, g, b)).convert("L")
        im = Image.merge("RGBA", [gray.point(lambda v, c=c: v * c // 255) for c in tint] + [a])
    bg = Image.new("RGBA", im.size, (40, 40, 40, 255))  # leaves/glass have holes: give them a floor
    bg.alpha_composite(im)
    return _padded(bg.resize((TILE_W, TILE), Image.LANCZOS))

SPRITE_DIR = None  # set by build_map_glyphs: textures/cooptown/map (sprites from the user's asset sheet)

# Markers drawn pixel by pixel at the glyph's own size (asked 2026-10-28: the sprites shrunk to one cell were too
# hard to see): a solid colour badge filling the cell, a dark rim, and a white sign. 7 x 10 (TILE_W x TILE);
# B = badge colour, W = white, D = dark.
PIXEL_MARKERS = {
    "base": ((220, 55, 45), ["BBBBBBB", "BBBWBBB", "BBWWWBB", "BWWWWWB", "WWWWWWW", "BWWWWWB", "BWWDWWB", "BWWDWWB", "BWWDWWB", "BBBBBBB"]),
    "landmark_found": ((40, 175, 70), ["BBBBBBB", "BWWWWBB", "BWWWWWB", "BWWWWBB", "BWBBBBB", "BWBBBBB", "BWBBBBB", "BWBBBBB", "BWBBBBB", "BBBBBBB"]),
    "landmark": ((245, 190, 30), ["BBBBBBB", "BBDDDBB", "BDBBBDB", "BBBBBDB", "BBBBDBB", "BBBDBBB", "BBBDBBB", "BBBBBBB", "BBBDBBB", "BBBBBBB"]),
    "event": ((245, 120, 30), ["BBBBBBB", "BBBWBBB", "BBBWBBB", "WWWWWWW", "BWWWWWB", "BBWWWBB", "BWWBWWB", "BWBBBWB", "BBBBBBB", "BBBBBBB"]),
    "player": ((50, 190, 245), ["BBBBBBB", "BBBBBBB", "BBWWWBB", "BWWWWWB", "BWWWWWB", "BWWWWWB", "BBWWWBB", "BBBBBBB", "BBBBBBB", "BBBBBBB"]),
}
RIM = (25, 20, 15, 255)

def pixel_marker(kind):
    """A marker glyph from PIXEL_MARKERS: the pattern inside a one-pixel dark rim (the PAD), CELL_W x CELL."""
    colour, rows = PIXEL_MARKERS[kind]
    out = Image.new("RGBA", (CELL_W, CELL), RIM); px = out.load()
    pal = {"B": colour + (255,), "W": (255, 255, 255, 255), "D": (40, 30, 20, 255)}
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            px[x + PAD, y + PAD] = pal[ch]
    return out

def _marker(kind):
    """Marker glyph: the pixel-drawn badge (PIXEL_MARKERS), else the imported sprite
    (textures/cooptown/map/marker_<kind>.png) on a dark square, else the drawn version."""
    import os
    if kind in PIXEL_MARKERS:
        return pixel_marker(kind)
    path = os.path.join(SPRITE_DIR or "", "marker_%s.png" % kind)
    if SPRITE_DIR and os.path.exists(path):
        out = Image.new("RGBA", (CELL_W, CELL), (20, 20, 25, 150))
        sprite = Image.open(path).convert("RGBA")
        side = min(CELL_W, CELL)
        icon = sprite.resize((side, side), Image.LANCZOS)
        out.alpha_composite(icon, ((CELL_W - side) // 2, (CELL - side) // 2))
        return out
    return _drawn_marker(kind)

def _drawn_marker(kind):
    s = TILE * 8  # draw large, then shrink
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c = s / 2
    if kind.startswith("arrow_"):
        import math
        angle = int(kind[-1]) * 45
        def pt(r, deg):
            rad = math.radians(deg)
            return (c + r * math.sin(rad), c - r * math.cos(rad))
        pts = [pt(s * 0.46, angle), pt(s * 0.4, angle + 140), pt(s * 0.16, angle + 180), pt(s * 0.4, angle + 220)]
        d.polygon(pts, fill=(255, 255, 255, 255), outline=(20, 20, 20, 255), width=s // 14)
    elif kind == "player":
        d.ellipse((s * 0.22, s * 0.22, s * 0.78, s * 0.78), fill=(90, 220, 255, 255), outline=(10, 30, 50, 255), width=s // 12)
    elif kind == "base":
        d.polygon([(c, s * 0.08), (s * 0.92, s * 0.48), (s * 0.08, s * 0.48)], fill=(220, 60, 50, 255), outline=(40, 10, 10, 255), width=s // 16)
        d.rectangle((s * 0.2, s * 0.48, s * 0.8, s * 0.9), fill=(240, 230, 210, 255), outline=(40, 30, 20, 255), width=s // 16)
    elif kind == "landmark":
        d.ellipse((s * 0.1, s * 0.1, s * 0.9, s * 0.9), fill=(250, 210, 60, 255), outline=(60, 40, 0, 255), width=s // 14)
        f = ImageFont.truetype(TEXT_FONT, int(s * 0.7))
        d.text((c, c), "?", font=f, fill=(60, 40, 0, 255), anchor="mm")
    elif kind == "landmark_found":
        d.rectangle((s * 0.22, s * 0.1, s * 0.3, s * 0.92), fill=(240, 240, 240, 255))
        d.polygon([(s * 0.3, s * 0.1), (s * 0.85, s * 0.28), (s * 0.3, s * 0.48)], fill=(70, 200, 90, 255), outline=(10, 60, 20, 255), width=s // 20)
    elif kind == "event":
        import math
        pts = []
        for k in range(10):
            r = s * (0.46 if k % 2 == 0 else 0.2)
            a = math.radians(k * 36)
            pts.append((c + r * math.sin(a), c - r * math.cos(a)))
        d.polygon(pts, fill=(255, 220, 40, 255), outline=(90, 60, 0, 255), width=s // 16)
    # a dark square behind the marker keeps the glyph a full tile wide, so the map grid stays aligned
    out = Image.new("RGBA", (CELL_W, CELL), (20, 20, 25, 190))
    out.alpha_composite(im.resize((CELL_W, CELL), Image.LANCZOS))
    return out

def _char(ch):
    """White text with a dark outline. Digits/letters are narrow, kanji and space are a full tile."""
    s = TILE * 8
    wide = ch in "北東南西"
    width = CELL if wide else 7
    im = Image.new("RGBA", (width * 8, s), (0, 0, 0, 0))
    if ch != " ":
        d = ImageDraw.Draw(im)
        f = ImageFont.truetype(KANJI_FONT if wide else TEXT_FONT, int(s * (0.78 if wide else 0.9)))
        d.text((im.size[0] / 2, s / 2), ch, font=f, fill=(255, 255, 255, 255), anchor="mm", stroke_width=s // 14, stroke_fill=(15, 15, 15, 255))
    # opaque dark background: the shifted fill copy of the map (drawn underneath) stays hidden, so the
    # coordinate line is not doubled; it also keeps every character its full width
    out = Image.new("RGBA", (width, CELL), (25, 25, 30, 255))
    out.alpha_composite(im.resize((width, CELL), Image.LANCZOS))
    return out

def arrow_image(direction, size=64):
    """White arrow with a dark outline pointing direction*45 degrees clockwise from north."""
    import math
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c = size / 2
    def pt(r, deg):
        rad = math.radians(deg)
        return (c + r * math.sin(rad), c - r * math.cos(rad))
    a = direction * 45
    d.polygon([pt(size * 0.46, a), pt(size * 0.4, a + 140), pt(size * 0.14, a + 180), pt(size * 0.4, a + 220)],
              fill=(255, 255, 255, 255), outline=(15, 15, 15, 255), width=max(2, size // 12))
    return im

def write_map_textures(out_dir):
    """Arrow images (drawn over the map centre) and the round frame."""
    import os
    os.makedirs(out_dir, exist_ok=True)
    for i in range(8):
        arrow_image(i).save(os.path.join(out_dir, "arrow_%d.png" % i))
    size = 256
    frame = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(frame)
    d.ellipse((2, 2, size - 3, size - 3), fill=(0, 0, 0, 150), outline=(230, 230, 230, 220), width=6)
    frame.save(os.path.join(out_dir, "frame_circle.png"))
    square = Image.new("RGBA", (size, size), (0, 0, 0, 150))
    ImageDraw.Draw(square).rectangle((0, 0, size - 1, size - 1), outline=(230, 230, 230, 220), width=6)
    square.save(os.path.join(out_dir, "frame_square.png"))

def build_map_glyphs(find, blocks, sprite_dir=None):
    global SPRITE_DIR
    SPRITE_DIR = sprite_dir
    """Returns [(key, image)] in placement order and the list of tiles without a texture."""
    out, missing = [], []
    for key, spec in TILES.items():
        if spec is None:
            im = Image.new("RGBA", (CELL_W, CELL), (25, 25, 30, 255))
        else:
            im = _texture(find, blocks, *spec)
            if im is None:
                missing.append(key)
                im = Image.new("RGBA", (CELL_W, CELL), (120, 120, 120, 255))
        out.append(("tile:" + key, im))
    blank = Image.new("RGBA", (CELL_W, CELL), (0, 0, 0, 0))  # outside the round map
    # a glyph with only nearly-invisible pixels counts as empty (zero width) in game, which collapsed the
    # round map's rows; faint dark dots at both edges keep the full cell width
    # faint grey dots at BOTH edges: the game trims empty columns on the left as well as the right
    # (one dot on the right only collapsed the rows); alpha 4 counted as empty, 40 worked
    for x in (0, CELL_W - 1):
        blank.putpixel((x, CELL // 2), (128, 128, 128, BLANK_DOT_ALPHA))
    out.append(("tile:blank", blank))
    out += [("marker:" + m, _marker(m)) for m in MARKERS]
    token = Image.new("RGBA", (1, CELL), (0, 0, 0, 0)); token.putpixel((0, CELL // 2), (255, 255, 255, 4))
    out += [("token:" + t, token) for t in TOKENS]
    return out, missing
