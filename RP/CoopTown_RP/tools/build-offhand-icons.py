"""Builds the off-hand pictures for the hotbar's F box (tools/build-hud-log.mjs shows the one the BP marks).

Bedrock's off hand holds only a shield, a totem of undying or arrows. The totem and arrow use the item icons
(textures/cooptown/items/, from build-item-icons.py); the shield has no item icon in the game, so its front face is
cut from the vanilla shield model texture (textures/entity/shield.png in the installed game).
Writes textures/cooptown/hotbar/off_shield.png.

Run from the CoopTown_RP folder:  python tools/build-offhand-icons.py
"""
import io, os, struct
from PIL import Image

GAME = os.path.join("C:" + os.sep, "XboxGames", "Minecraft for Windows", "Content", "data", "resource_packs")
RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONT = (1, 1, 13, 23)  # the shield's front face in the 64x64 model texture
SIZE = 64               # output picture (square, the face centred, pixels kept sharp)

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

def main():
    entity = read_archive(os.path.join(GAME, "vanilla", "__brarchive", "textures", "entity.brarchive"))
    face = Image.open(io.BytesIO(entity["shield.png"])).convert("RGBA").crop(FRONT)
    k = SIZE // max(face.size)
    face = face.resize((face.width * k, face.height * k), Image.NEAREST)
    out = Image.new("RGBA", (SIZE, SIZE))
    out.paste(face, ((SIZE - face.width) // 2, (SIZE - face.height) // 2))
    out.save(os.path.join(RP, "textures", "cooptown", "hotbar", "off_shield.png"))
    print("off-hand shield picture:", face.size)

if __name__ == "__main__":
    main()
