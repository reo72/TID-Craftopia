"""Builds the pictures for the top-left profile and the info panels (tools/build-hud-log.mjs places them).

Pictures from the user's asset zips (tools/assets/profile/): plate, face frame, title ribbon and medal, and
one icon per job; the info panels (tools/assets/info/): money / bank, tracked quest with its progress bar, and
biome / coordinates under the minimap. Job names, titles, "Lv." and digits are drawn as pictures too: the HUD picks them with
hidden marks, because it cannot cut the text it gets apart. The job and title lists come from the BP
(scripts/profile-config.js), so rerun this after changing them.
Everything is saved at 4x its size on screen (sharper in game).
Writes textures/cooptown/profile/*.png and tools/profile-layout.json (picture shapes for the HUD builder).

Run from the CoopTown_RP folder:  python tools/build-profile.py
"""
import json, os, subprocess
from PIL import Image, ImageDraw, ImageFont

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "profile")
INFO_SRC = os.path.join(RP, "tools", "assets", "info")
OUT = os.path.join(RP, "textures", "cooptown", "profile")
BP_SCRIPTS = os.path.join(RP, "..", "..", "development_behavior_packs", "CoopTown_BP", "scripts")
FONT = r"C:\Windows\Fonts\YuGothB.ttc"
SCALE = 4
# size on screen (UI px): width for the plate, height for the rest
PLATE_W = 180
# the plate as drawn in the HUD (UI px) and the face frame on it: keep in step with PRO in build-hud-log.mjs
PLATE_HUD = (180, 64)
FRAME_IN_PLATE = (12, 10, 44)  # x, y, height
SIZES = {"avatar_frame": 45, "title_ribbon": 15, "title_medal": 17, "job": 13}
TEXT_H = {"job": 9, "title": 8}
# icon file per job, in the BP's JOBS order
# 畜産農家: a stand-in (farmer); 冒険家 the compass, 鉱夫 / 木こり their own (2026-10-30, the job split)
JOB_ICONS = {"冒険家": "compass", "鉱夫": "miner", "木こり": "logger", "畜産農家": "farmer", "農家": "farmer", "鍛冶師": "blacksmith",
             "料理人": "cook", "付与術師": "enchanter", "釣り師": "fisher", "調合師": "alchemist"}
BROWN = (70, 36, 16, 255)
CREAM = (255, 246, 214, 255)
GREEN_EDGE = (22, 46, 14, 255)

def lists():
    """[jobs], [titles] from the BP's profile-config.js."""
    url = "file:///" + os.path.abspath(os.path.join(BP_SCRIPTS, "profile-config.js")).replace(os.sep, "/")
    code = "const m=await import(%s);console.log(JSON.stringify([m.PROFILE_JOBS,m.PROFILE_TITLES]))" % json.dumps(url)
    # the BP's config now imports @minecraft/server (through quality.js): load it with the tests' stubs
    reg = "file:///" + os.path.abspath(os.path.join(RP, "tools", "tests", "register.mjs")).replace(os.sep, "/")
    out = subprocess.run(["node", "--no-warnings", "--import", reg, "--input-type=module", "-e", code], capture_output=True, text=True, encoding="utf8", check=True)
    return json.loads(out.stdout)

def solid_box(im, alpha=40):
    """Bounding box of the clearly visible pixels (ignores faint shadows)."""
    return im.getchannel("A").point(lambda a: 255 if a > alpha else 0).getbbox()

def picture(name, height=None, width=None, src=SRC):
    im = Image.open(os.path.join(src, name + ".png")).convert("RGBA")
    im = im.crop(solid_box(im))
    w, h = (width * SCALE, round(width * SCALE * im.height / im.width)) if width else (round(height * SCALE * im.width / im.height), height * SCALE)
    return im.resize((w, h), Image.LANCZOS)

def square(im):
    """A job icon fitted into a square of its height (wide icons such as the open book shrink and centre), so every
    icon takes the same room in front of the job name."""
    s = im.height
    if im.width > s:
        im = im.resize((s, round(s * im.height / im.width)), Image.LANCZOS)
    out = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    out.paste(im, ((s - im.width) // 2, (s - im.height) // 2), im)
    return out

def frame_hole(im):
    """The see-through middle of the face frame, as fractions of the picture."""
    a = im.getchannel("A")
    w, h = im.size
    cx, cy = w // 2, h // 2
    edge = lambda xs, f: next(i for i in xs if f(i) > 128)
    x0 = edge(range(cx, -1, -1), lambda x: a.getpixel((x, cy))) + 1
    x1 = edge(range(cx, w), lambda x: a.getpixel((x, cy)))
    y0 = edge(range(cy, -1, -1), lambda y: a.getpixel((cx, y))) + 1
    y1 = edge(range(cy, h), lambda y: a.getpixel((cx, y)))
    return {"x0": x0 / w, "x1": x1 / w, "y0": y0 / h, "y1": y1 / h}

def grey_run(values):
    """First and last index of the dark grey (empty bar) pixels in a row or column."""
    idx = [i for i, (r, g, b, a) in enumerate(values) if a > 200 and max(r, g, b) < 70 and max(r, g, b) - min(r, g, b) < 12]
    return idx[0], idx[-1] + 1

# info panels: picture -> height on screen (UI px); progress fill in 5 % steps
INFO = {"wallet_bank_panel": 17, "wallet_coins": 11, "bank_vault": 11, "quest_panel": 32, "quest_scroll": 13,
        "progress_track": 6, "location_panel": 26, "biome_leaf": 9, "coordinates_compass": 9}
FILL_STEPS = 20

def info_pictures(save):
    """Saves the info panel pictures; returns the progress track's empty inner area (fractions)."""
    for name, h in INFO.items():
        save(name, picture(name, height=h, src=INFO_SRC))
    track = picture("progress_track", height=INFO["progress_track"] * 4, src=INFO_SRC)  # measured larger for accuracy
    w, h = track.size
    x0, x1 = grey_run([track.getpixel((x, h // 2)) for x in range(w)])
    y0, y1 = grey_run([track.getpixel((w // 2, y)) for y in range(h)])
    inner = {"x0": x0 / w, "x1": x1 / w, "y0": y0 / h, "y1": y1 / h}
    # the green bar cut into its left 5 %, 10 %, ... (the HUD shows one, so the bar is clipped, not squashed)
    fill = Image.open(os.path.join(INFO_SRC, "progress_fill.png")).convert("RGBA")
    fill = fill.crop(solid_box(fill))
    fw = round((x1 - x0) / track.width * INFO["progress_track"] * shape_of(track) * SCALE)
    fh = round((y1 - y0) / track.height * INFO["progress_track"] * SCALE)
    fill = fill.resize((fw, max(1, fh)), Image.LANCZOS)
    for k in range(1, FILL_STEPS + 1):
        save("fill_%d" % k, fill.crop((0, 0, max(1, round(fw * k / FILL_STEPS)), fill.height)))
    return inner

def shape_of(im):
    return im.width / im.height

def text_picture(text, height, color, edge=None):
    """Text in the bold gothic font, all lines the same height (same top and bottom) so they line up."""
    px = height * SCALE
    size, ref = px, "鉱夫称号Lv.0123456789：あア"
    for s in range(6, 400):
        b = ImageDraw.Draw(Image.new("L", (1, 1))).textbbox((0, 0), ref, font=ImageFont.truetype(FONT, s))
        if b[3] - b[1] >= px:
            size = s
            break
    font = ImageFont.truetype(FONT, size)
    stroke = max(1, size // 12) if edge else 0
    d = ImageDraw.Draw(Image.new("L", (1, 1)))
    top, bottom = d.textbbox((0, 0), ref, font=font, stroke_width=stroke)[1::2]
    l, _, r, _ = d.textbbox((0, 0), text, font=font, stroke_width=stroke)
    im = Image.new("RGBA", (r - l + 2, bottom - top), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((1 - l, -top), text, font=font, fill=color, stroke_width=stroke, stroke_fill=edge)
    return im

def main():
    jobs, titles = lists()
    os.makedirs(OUT, exist_ok=True)
    shapes = {}
    def save(name, im):
        im.save(os.path.join(OUT, name + ".png"))
        shapes[name] = round(im.width / im.height, 4)  # width / height
    plate = picture("profile_backplate", width=PLATE_W)
    save("plate", plate)
    frame = picture("avatar_frame", height=SIZES["avatar_frame"])
    save("avatar_frame", frame)
    hole = frame_hole(frame)
    # plate with the face frame's opening cut out: the player model is drawn behind the plate and shows through
    # it, so the held item (which the game draws outside any clipping) is hidden by the plate
    cut = plate.resize((PLATE_HUD[0] * SCALE, PLATE_HUD[1] * SCALE), Image.LANCZOS)
    fx, fy, fh = FRAME_IN_PLATE
    fw = fh * frame.width / frame.height
    box = [round((fx + hole["x0"] * fw) * SCALE), round((fy + hole["y0"] * fh) * SCALE), round((fx + hole["x1"] * fw) * SCALE), round((fy + hole["y1"] * fh) * SCALE)]
    paper = cut.getpixel(((box[0] + box[2]) // 2, (box[1] + box[3]) // 2))
    ImageDraw.Draw(cut).rectangle([box[0], box[1], box[2] - 1, box[3] - 1], fill=(0, 0, 0, 0))
    save("plate_cut", cut)
    save("title_ribbon", picture("title_ribbon", height=SIZES["title_ribbon"]))
    save("title_medal", picture("title_medal", height=SIZES["title_medal"]))
    for i, job in enumerate(jobs, 1):  # job number 1.. (0 = none)
        save("job_%d" % i, square(picture("job_" + JOB_ICONS[job], height=SIZES["job"])))
        save("job_name_%d" % i, text_picture(job, TEXT_H["job"], BROWN))
    save("lv", text_picture("Lv.", TEXT_H["job"], BROWN))
    for d in range(10):
        save("digit_%d" % d, text_picture(str(d), TEXT_H["job"], BROWN))
    for i, title in enumerate(titles):
        save("title_%d" % i, text_picture("称号：" + title, TEXT_H["title"], CREAM, GREEN_EDGE))
    track_inner = info_pictures(save)
    layout = {"jobs": len(jobs), "titles": len(titles), "shapes": shapes, "frame_hole": hole, "track_inner": track_inner, "fill_steps": FILL_STEPS}
    with open(os.path.join(RP, "tools", "profile-layout.json"), "w", encoding="utf8") as f:
        json.dump(layout, f, ensure_ascii=False, indent=1)
    print("profile pictures:", len(shapes), "titles:", len(titles), "frame hole:", layout["frame_hole"])

if __name__ == "__main__":
    main()
