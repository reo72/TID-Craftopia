"""The party invitation screen's pictures (asked 2026-10-28 with a mockup and the user's zip
C:/Users/reo72/Downloads/TID_Craftopia_Party_Invite_UI_Assets.zip, copied into tools/assets/party_invite/):
cropped to what is drawn and scaled down into textures/cooptown/party_invite/. The screen: tools/build-party-invite-ui.mjs.
Run from the CoopTown_RP folder:  python -P tools/import-party-invite.py
"""
import os
from PIL import Image
RP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT = os.path.join(RP, "tools", "assets", "party_invite"), os.path.join(RP, "textures", "cooptown", "party_invite")
WIDTH = {"dialog_frame": 600, "header_plate": 440, "inviter_frame": 440, "portrait_frame": 128, "member_empty": 96, "title_badge": 280,
         "divider": 400, "button_accept": 240, "button_decline": 240, "button_close": 64, "icon_check": 48, "icon_cross": 40, "icon_party": 64}
os.makedirs(OUT, exist_ok=True)
for name, w in WIDTH.items():
    im = Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
    im = im.crop(im.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox())  # faint specks outside the drawing are left out
    im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS).save(os.path.join(OUT, name + ".png"))
    print(name, w)
