# Imports the user's gacha screen pictures (TID_Craftopia_Gacha_UI_Assets.zip, 2026-10-31; kept in tools/assets/gacha_ui)
# to textures/cooptown/gacha_ui/ at a game size. The three chest pictures were drawn separately, so they are cut to what
# is visible, scaled to the same width and stood on the same bottom line of one square.
# Run: python tools/import-gacha-ui.py   (from the CoopTown_RP folder)
import os
from PIL import Image
SRC=os.path.join('tools','assets','gacha_ui')
OUT=os.path.join('textures','cooptown','gacha_ui')
os.makedirs(OUT,exist_ok=True)
CHEST=512; CHEST_W=430
SIZES={'screen_frame':(1024,576),'reward_panel':(512,768),'button_green':(512,205),'button_skip':(512,171),
 'glow_blue':(512,512),'glow_purple':(512,512),'glow_gold':(512,447),'magic_circle':(512,341),'title_plate':(512,205),'rarity_badge':(512,171)}
def solid(im):
    return im.getchannel('A').point(lambda a:255 if a>40 else 0).getbbox()
for n in ('chest_closed','chest_half','chest_open'):
    im=Image.open(os.path.join(SRC,n+'.png')).convert('RGBA');im=im.crop(solid(im))
    h=round(CHEST_W*im.height/im.width);im=im.resize((CHEST_W,h),Image.LANCZOS)
    out=Image.new('RGBA',(CHEST,CHEST),(0,0,0,0));out.paste(im,((CHEST-CHEST_W)//2,CHEST-h-8),im)
    out.save(os.path.join(OUT,n+'.png'))
for n,size in SIZES.items():
    Image.open(os.path.join(SRC,n+'.png')).convert('RGBA').resize(size,Image.LANCZOS).save(os.path.join(OUT,n+'.png'))
print('gacha pictures:',len(SIZES)+3)
