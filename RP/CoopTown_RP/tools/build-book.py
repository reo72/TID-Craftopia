"""Builds the shared pictures of the new book menu (tools/build-book-ui.mjs places them).

Source: the user's menu asset zips, copied to tools/assets/book/ (common/ = parts every page shares,
<NN_Page>/ = each page's icons and widgets, reference/ = the finished page images used for positions).
Buttons are stretched sideways by cutting them in three (ends kept, middle stretched or squeezed), so the
corner decorations are not squashed. Pictures are saved at about 4x their size on screen.
Writes textures/cooptown/book/*.png and tools/book-layout.json (picture shapes).

Run from the CoopTown_RP folder:  python tools/build-book.py
"""
import json, os
from PIL import Image

RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RP, "tools", "assets", "book")
OUT = os.path.join(RP, "textures", "cooptown", "book")
SCALE = 4
# button shapes (width / height) used by the pages, and their height on screen (UI px)
BUTTONS = {"card": (2.04, 41), "row": (3.7, 49), "wide": (7.6, 23), "square": (1.0, 70), "long": (5.7, 32)}
END = 0.16  # share of the button height kept unstretched at each end (the corner ornaments)
# page icons: every <NN_Page>/icons/*.png, saved once each as icons/<name>.png (pages share names: coins, scroll, ...)
ICON_H = 24

def load(rel):
    im = Image.open(os.path.join(SRC, rel)).convert("RGBA")
    return im.crop(im.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox())

def sized(im, h):
    return im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)

def three_slice(im, aspect, h):
    """im at height h and width aspect*h: both ends kept as they are, the middle stretched or squeezed."""
    im = sized(im, h)
    w, e = round(aspect * h), max(1, round(END * im.height * 1.6))
    mid = im.crop((e, 0, im.width - e, h)).resize((max(1, w - 2 * e), h), Image.LANCZOS)
    out = Image.new("RGBA", (w, h))
    out.paste(im.crop((0, 0, e, h)), (0, 0))
    out.paste(mid, (e, 0))
    out.paste(im.crop((im.width - e, 0, im.width, h)), (w - e, 0))
    return out

def reddened(im):
    """The selected bookmark: the brown tab turned red (only one tab picture was supplied)."""
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a and r > g + 8 and r < 170:  # dark brown leather only (not the gold corners)
                px[x, y] = (min(255, int(r * 1.45 + 25)), int(g * 0.42), int(b * 0.42), a)
    return im

def main():
    os.makedirs(OUT, exist_ok=True)
    shapes = {}
    def save(name, im):
        im.save(os.path.join(OUT, name + ".png"))
        shapes[name] = round(im.width / im.height, 4)
    book = load("common/book_background.png")
    save("book", book)  # already about 3x its size on screen
    for kind, (aspect, h) in BUTTONS.items():
        save("button_" + kind, three_slice(load("common/button_normal.png"), aspect, h * SCALE))
        save("button_" + kind + "_selected", three_slice(load("common/button_selected.png"), aspect, h * SCALE))
    tab = sized(load("common/bookmark_tab.png"), 29 * SCALE)
    save("tab", tab)
    save("tab_selected", reddened(tab.copy()))
    save("close", sized(load("common/close_button.png"), 20 * SCALE))
    for name in ("home_icon", "person_icon", "settings_icon"):
        save(name.replace("_icon", ""), sized(load("common/" + name + ".png"), 13 * SCALE))
    os.makedirs(os.path.join(OUT, "icons"), exist_ok=True)
    for page in sorted(os.listdir(SRC)):
        folder = os.path.join(SRC, page, "icons")
        if not os.path.isdir(folder):
            continue
        for f in sorted(os.listdir(folder)):
            name = "icons/" + f[:-4]
            if f.endswith(".png") and name not in shapes:
                save(name, sized(load(os.path.join(page, "icons", f)), ICON_H * SCALE))
    with open(os.path.join(RP, "tools", "book-layout.json"), "w", encoding="utf8") as f:
        json.dump({"shapes": shapes}, f, indent=1)
    print("book pictures:", len(shapes))

if __name__ == "__main__":
    main()
