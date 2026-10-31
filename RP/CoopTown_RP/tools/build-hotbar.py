"""Hotbar pictures cut from the user's mockup (tools/assets/hotbar/mockup.webp, about 7.94 mockup px per UI px).

Pictures the game draws itself are replaced (items stay on top of them):
  textures/ui/hotbar_0..8 (slot + wood + number), hotbar_start/end_cap, selected_hotbar_slot,
  heart / heart_half / heart_background, hunger_full / hunger_half / hunger_background,
  armor_full / armor_half / armor_empty, and the vanilla XP bar (made invisible: the bar shows CoopTown XP).
Overlay pieces for tools/build-hud-log.mjs go to textures/cooptown/hotbar/.
Run from the CoopTown_RP folder: python tools/build-hotbar.py
"""
import os
from collections import deque
from PIL import Image, ImageDraw, ImageFont

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# the final mockup (stress as lightning above the hunger row) when present, else the first one; same layout
SRC = next(f for f in (os.path.join(RP, "tools", "assets", "hotbar", n) for n in ("mockup_final.webp", "mockup.webp")) if os.path.exists(f))
UI = os.path.join(RP, "textures", "ui")
OUT = os.path.join(RP, "textures", "cooptown", "hotbar")
FONT = r"C:\Windows\Fonts\YuGothB.ttc"
INK = (61, 30, 18, 255)
os.makedirs(UI, exist_ok=True); os.makedirs(OUT, exist_ok=True)

mock = Image.open(SRC).convert("RGBA")

def clear_background(im):
    """Off-white around the drawing becomes transparent (flood fill from the edges)."""
    px = im.load(); w, h = im.size
    bg = lambda p: min(p[:3]) > 235
    todo = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    seen = set()
    while todo:
        p = todo.popleft()
        if p in seen: continue
        seen.add(p)
        if not bg(px[p]): continue
        px[p] = (0, 0, 0, 0); x, y = p
        for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= n[0] < w and 0 <= n[1] < h and n not in seen: todo.append(n)
    return im

mock = clear_background(mock)
crop = lambda box: mock.crop(box)
def fit(im, size):
    return im.resize(size, Image.LANCZOS)
def hole(im, box):
    """Make a rectangle transparent (box in the image's own pixels)."""
    im = im.copy(); ImageDraw.Draw(im).rectangle(box, fill=(0, 0, 0, 0)); return im
def stretch3(im, left, right, width, height):
    """Scale to height, keep both ends' proportions, stretch only the middle to reach width (UI px)."""
    w, h = im.size; k = height / h
    lw, rw = max(1, round(left * k)), max(1, round(right * k))
    parts = [im.crop((0, 0, left, h)), im.crop((left, 0, w - right, h)), im.crop((w - right, 0, w, h))]
    out = Image.new("RGBA", (width, height))
    out.alpha_composite(fit(parts[0], (lw, height)), (0, 0))
    out.alpha_composite(fit(parts[1], (width - lw - rw, height)), (lw, 0))
    out.alpha_composite(fit(parts[2], (rw, height)), (width - rw, 0))
    return out
# pictures are saved at 4x their in-game size (the HUD sets the size), so they stay sharp on screen
X = 4
def save(im, *path):
    im.save(os.path.join(*path) + ".png")

# ---- slots: wood segment + parchment slot + number (20x22 each, like the game's own) ----
PITCH, FIRST = 158.8, 293          # slot pitch and slot 1's left edge in the mockup
STRIP = (323, 497)                 # wood strip top / bottom
def segment(k):
    x0 = FIRST + (k - 1) * PITCH - 9
    return crop((round(x0), STRIP[0], round(x0 + PITCH), STRIP[1]))
base = segment(5).copy()          # a plain slot; its number is painted over and redrawn per slot
paper = base.getpixel((60, 120))
ImageDraw.Draw(base).rectangle((14, 22, 58, 76), fill=paper)
font = ImageFont.truetype(FONT, 52)
for k in range(1, 10):
    im = base.copy(); ImageDraw.Draw(im).text((25, 28), str(k), font=font, fill=INK, stroke_width=3, stroke_fill=INK, anchor="lt")  # bold like the mockup
    save(fit(im, (20 * X, 22 * X)), UI, "hotbar_%d" % (k - 1))
save(fit(segment(1).crop((0, 0, 8, STRIP[1] - STRIP[0])), (1 * X, 22 * X)), UI, "hotbar_start_cap")
save(fit(segment(9).crop((150, 0, 158, STRIP[1] - STRIP[0])), (1 * X, 22 * X)), UI, "hotbar_end_cap")
# selected slot: the gold frame around slot 1, inside left clear for the item
sel = hole(crop((278, 323, 449, 497)), (24, 24, 147, 150))
save(fit(sel, (24 * X, 24 * X)), UI, "selected_hotbar_slot")

# ---- hearts / hunger / armor (9x9; the game spaces them 8 px apart) ----
track = (52, 30, 22, 255)
def icon9(src, inset=1):
    im = Image.new("RGBA", (9, 9), (0, 0, 0, 0)); im.alpha_composite(fit(src, (9 - 2 * inset, 9 - 2 * inset)), (inset, inset)); return im
dark = Image.new("RGBA", (9, 9), track)
heart = icon9(crop((392, 228, 430, 272)))
save(dark, UI, "heart_background"); save(heart, UI, "heart")
half = heart.copy(); ImageDraw.Draw(half).rectangle((5, 0, 8, 8), fill=(0, 0, 0, 0)); save(half, UI, "heart_half")
drum = icon9(crop((1214, 226, 1262, 276)), 0)
save(dark, UI, "hunger_background"); save(drum, UI, "hunger_full")
dh = drum.copy(); ImageDraw.Draw(dh).rectangle((0, 0, 3, 8), fill=(0, 0, 0, 0)); save(dh, UI, "hunger_half")
# The user's own status icons (tools/assets/hotbar/status/<health|hunger>/<full|half|empty>.png) replace the
# ones cut from the mockup when present. Their sizes and margins differ, so each is cut to its solid part and
# fitted into the same box; drawn at 4x (36x36 in a 9x9 cell) to stay sharp. The right column is left empty so
# neighbours (8 px apart) keep a small gap.
STATUS = os.path.join(RP, "tools", "assets", "hotbar", "status")
def status_icon(kind, state, box=36, cell=36):  # fills the 9 px cell: icons 8 px apart overlap by 1 px, no gap
    im = Image.open(os.path.join(STATUS, kind, state + ".png")).convert("RGBA")
    solid = im.split()[3].point(lambda v: 255 if v > 128 else 0).getbbox()
    im = im.crop(solid); k = box / max(im.size)
    small = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    out = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    out.alpha_composite(small, ((cell - small.width) // 2, (cell - small.height) // 2))
    return out
if os.path.isdir(STATUS):
    for kind, names in (("health", ("heart", "heart_half", "heart_background")), ("hunger", ("hunger_full", "hunger_half", "hunger_background"))):
        for state, name in zip(("full", "half", "empty"), names):
            save(status_icon(kind, state), UI, name)
    # the drumstick is diagonal and leaves gaps: each hunger cell gets the empty heart's dark square behind it
    # (the game draws the background under every cell, full / half on top), so the gauge reads as one track
    square = status_icon("health", "empty")
    back = square.copy(); back.alpha_composite(status_icon("hunger", "empty", box=30))
    save(back, UI, "hunger_background")
    for state, name in (("full", "hunger_full"), ("half", "hunger_half")):
        cell = square.copy(); cell.alpha_composite(status_icon("hunger", state, box=30)); save(cell, UI, name)
shield = icon9(crop((316, 155, 367, 207)), 0)
lit = Image.eval(shield, lambda v: v); lit = Image.merge("RGBA", [*(c.point(lambda v: min(255, int(v * 1.6 + 30))) for c in shield.split()[:3]), shield.split()[3]])
save(shield, UI, "armor_empty"); save(lit, UI, "armor_full")
ah = shield.copy(); ah.alpha_composite(lit.crop((0, 0, 5, 9)), (0, 0)); save(ah, UI, "armor_half")
# vanilla XP bar hidden (same sizes, transparent)
for name, size in (("experiencebarempty", (182, 5)), ("experiencebarfull", (182, 5)), ("experiencenub", (1, 5))):
    save(Image.new("RGBA", size, (0, 0, 0, 0)), UI, name)

# ---- overlay pieces (UI px sizes; positions are in build-hud-log.mjs) ----
H_BAND = 13
def clear_above(im, top, keep):
    """Clear what sticks into the band from above (shield / lightning tips), except the icon box columns."""
    im = im.copy(); d = ImageDraw.Draw(im)
    xs = [x for x in range(im.width) if not any(a <= x < b for a, b in keep)]
    for x in xs: d.line([(x, 0), (x, top)], fill=(0, 0, 0, 0))
    return im
left = hole(clear_above(crop((250, 196, 860, 296)), 14, [(40, 140)]), (138, 28, 548, 84))        # heart box + hearts track (hole for the hearts)
save(stretch3(left, 140, 62, 107 * X, H_BAND * X), OUT, "band_left")
right = hole(clear_above(crop((1145, 196, 1752, 296)), 14, [(460, 607)]), (58, 28, 470, 86))      # hunger track (hole) + drumstick box
save(stretch3(right, 58, 137, 107 * X, H_BAND * X), OUT, "band_right")
plate = crop((855, 195, 1147, 293))
save(stretch3(plate, 120, 60, 50 * X, H_BAND * X), OUT, "lv_plate")
# XP: wood row with an empty (dark) bar; the green fill is drawn in steps on top
xp = crop((268, 288, 1734, 330)).copy()
dark_bar = crop((1310, 298, 1716, 320))
xp.alpha_composite(fit(dark_bar, (1440, 22)), (14, 10))
save(fit(xp, (186 * X, 9 * X)), OUT, "xp_back")
save(fit(crop((300, 300, 1280, 318)), (180 * X, 5 * X)), OUT, "xp_fill")
# F / E boxes with their connectors
save(fit(crop((62, 318, 281, 498)), (28 * X, 23 * X)), OUT, "box_f")
save(fit(crop((1724, 318, 1941, 498)), (28 * X, 23 * X)), OUT, "box_e")
# stress panel: bar emptied, the number area left blank for live digits
st = crop((1165, 130, 1753, 218)).copy(); d = ImageDraw.Draw(st)
st.alpha_composite(fit(crop((1430, 160, 1560, 190)), (230, 30)), (168, 29))
d.rectangle((412, 24, 562, 66), fill=st.getpixel((400, 70)))
save(fit(st, (74, 11)), OUT, "stress_panel")
save(fit(crop((1336, 162, 1410, 188)), (60, 6)), OUT, "stress_fill")
# digits (and " / 100") in the dark brown of the mockup's text
dfont = ImageFont.truetype(FONT, 64)
for ch, name in [*((str(i), "digit_%d" % i) for i in range(10)), ("/100", "slash100")]:
    b = ImageDraw.Draw(Image.new("L", (1, 1))).textbbox((0, 0), ch, font=dfont)
    im = Image.new("RGBA", (b[2] - b[0] + 4, 72), (0, 0, 0, 0)); ImageDraw.Draw(im).text((2 - b[0], 4 - b[1] + (64 - (b[3] - b[1])) // 2), ch, font=dfont, fill=INK)
    save(im, OUT, name)
# ---- the user's HUD kit (tools/assets/hotbar/kit) ----
# The final mockup decides the look: from the kit only the parts that match it are used (shield, lightning).
KIT_PARTS = {"armor", "stress"}
KIT = os.path.join(RP, "tools", "assets", "hotbar", "kit")
def kit(path):
    im = Image.open(os.path.join(KIT, path)).convert("RGBA")
    return im.crop(im.split()[3].point(lambda v: 255 if v > 128 else 0).getbbox())
def fit_in(im, w, h, cw, ch, x=None, y=None):
    """im scaled to fit w x h, placed on a cw x ch canvas (centred unless x / y given)."""
    k = min(w / im.width, h / im.height); small = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    out = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    out.alpha_composite(small, ((cw - small.width) // 2 if x is None else x, (ch - small.height) // 2 if y is None else y)); return out
if os.path.isdir(KIT):
    base, slot = kit("frames/hud_base.png"), kit("frames/slot_normal.png")
    use = lambda part: part in KIT_PARTS
    wood = base.crop((base.width // 5, 0, base.width * 4 // 5, base.height))
    nfont = ImageFont.truetype(FONT, 20)
    for k in (range(1, 10) if use("slots") else ()):  # 4x: 80 x 88 for a 20 x 22 slot
        im = wood.resize((80, 88), Image.LANCZOS)
        im.alpha_composite(fit_in(slot, 74, 80, 80, 88))
        ImageDraw.Draw(im).text((12, 10), str(k), font=nfont, fill=INK)
        save(im, UI, "hotbar_%d" % (k - 1))
    if use("slots"):
        save(wood.crop((0, 0, 8, wood.height)).resize((4, 88)), UI, "hotbar_start_cap")
        save(wood.crop((wood.width - 8, 0, wood.width, wood.height)).resize((4, 88)), UI, "hotbar_end_cap")
        save(fit_in(kit("frames/slot_selected.png"), 96, 96, 96, 96), UI, "selected_hotbar_slot")
    # armor: the shield as full, a dim one as empty, half = left half full
    sh = fit_in(kit("icons/armor_shield.png"), 30, 30, 36, 36, x=1)
    empty = Image.merge("RGBA", [*(c.point(lambda v: int(v * .45)) for c in sh.split()[:3]), sh.split()[3].point(lambda v: int(v * .8))])
    half = empty.copy(); half.alpha_composite(sh.crop((0, 0, 17, 36)), (0, 0))
    if use("armor"): save(sh, UI, "armor_full"); save(empty, UI, "armor_empty"); save(half, UI, "armor_half")
    # stress row (lightning): drawn by the HUD from the stress number
    for state in (("full", "half", "empty") if use("stress") else ()):
        save(fit_in(kit("icons/stress_%s.png" % state), 30, 30, 36, 36, x=1), OUT, "stress_" + state)
    # Lv plate with "Lv." written on it (the number is drawn next to it by the HUD)
    if use("plate"):
        plate = fit_in(kit("frames/level_plate.png"), 200, 52, 200, 52); lf = ImageFont.truetype(FONT, 26)
        ImageDraw.Draw(plate).text((26, 9), "Lv.", font=lf, fill=INK)
        save(plate, OUT, "lv_plate")
    # XP gauge: track and green fill
    if use("gauge"):
        save(kit("gauges/gauge_track.png").resize((744, 36), Image.LANCZOS), OUT, "xp_back")
        save(kit("gauges/experience_fill.png").resize((720, 12), Image.LANCZOS), OUT, "xp_fill")
    # F / E boxes: the mockup's connector + the kit's slot, with the letter (and the chest for E)
    conn = crop((228, 345, 281, 470))
    for name, letter, flip in ((("box_f", "F", False), ("box_e", "E", True)) if use("boxes") else ()):
        im = Image.new("RGBA", (112, 92), (0, 0, 0, 0))
        box = fit_in(slot, 84, 92, 84, 92)
        ImageDraw.Draw(box).text((16, 16), letter, font=nfont, fill=INK)
        if letter == "E": box.alpha_composite(fit_in(kit("icons/inventory_chest.png"), 40, 34, 84, 92, y=40))
        c = conn.resize((28, 62), Image.LANCZOS)
        if flip: im.alpha_composite(c, (0, 15)); im.alpha_composite(box, (28, 0))
        else: im.alpha_composite(box, (0, 0)); im.alpha_composite(c, (84, 15))
        save(im, OUT, name)
# ---- armor and status hearts (tools/assets/hotbar/status/armor, hearts) ----
# Armor full / half / empty replace the kit shield. Status hearts: the game also wants a half and a "flash"
# (hit) version of each; half = left half, flash = brightened. The normal heart gets its flash / blink too.
bright = lambda im: Image.merge("RGBA", [*(c.point(lambda v: min(255, int(v * 1.35 + 40))) for c in im.split()[:3]), im.split()[3]])
left_half = lambda im: (lambda h: (ImageDraw.Draw(h).rectangle((18, 0, 35, 35), fill=(0, 0, 0, 0)), h)[1])(im.copy())
if os.path.isdir(os.path.join(STATUS, "armor")):
    for state, name in (("full", "armor_full"), ("half", "armor_half"), ("empty", "armor_empty")):
        save(status_icon("armor", state), UI, name)
SQUARE = os.path.join(STATUS, "square")   # square status hearts (full / half / empty) matching the red squares
for src, game in (("poison", "poison_heart"), ("wither", "wither_heart"), ("absorption", "absorption_heart"), ("frozen", "freeze_heart")):
    if os.path.isdir(os.path.join(SQUARE, src)):
        # the game draws its one heart_background under every heart, so the "empty" pictures are not needed
        h, hh = status_icon(os.path.join("square", src), "full"), status_icon(os.path.join("square", src), "half")
        save(h, UI, game); save(hh, UI, game + "_half"); save(bright(h), UI, game + "_flash"); save(bright(hh), UI, game + "_flash_half")
    elif os.path.isdir(os.path.join(STATUS, "hearts")):  # the earlier heart-shaped ones
        h = status_icon("hearts", src)
        save(h, UI, game); save(left_half(h), UI, game + "_half")
        save(bright(h), UI, game + "_flash"); save(left_half(bright(h)), UI, game + "_flash_half")
if os.path.isdir(STATUS):
    h = Image.open(os.path.join(UI, "heart.png")).convert("RGBA")
    save(bright(h), UI, "heart_flash"); save(left_half(bright(h)), UI, "heart_flash_half")
    save(bright(Image.open(os.path.join(UI, "heart_background.png")).convert("RGBA")), UI, "heart_blink")
print("hotbar pictures written" + (" (with the HUD kit)" if os.path.isdir(KIT) else ""))
