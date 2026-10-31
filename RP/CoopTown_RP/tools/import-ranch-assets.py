# Cuts the user's feeding-station (飼育台) pictures (tools/assets/ranch_ui, from TID_Craftopia_Livestock_UI_Assets.zip)
# to textures/cooptown/ranch: trimmed to what is drawn and scaled down for the game.
# Run: python tools/import-ranch-assets.py   (from the CoopTown_RP folder)
import glob,os
from PIL import Image
SRC='tools/assets/ranch_ui';OUT='textures/cooptown/ranch'
# folder -> longest side in px
SIZES={'ui':560,'icons':128,'feed':160,'animals':128}
for folder,size in SIZES.items():
 os.makedirs(f'{OUT}/{folder}',exist_ok=True)
 for p in sorted(glob.glob(f'{SRC}/{folder}/*.png')):
  im=Image.open(p).convert('RGBA')
  # trim the faint haze around the picture (alpha under 24 counts as empty)
  box=im.getchannel('A').point(lambda a:255 if a>=24 else 0).getbbox()
  im=im.crop(box)
  s=size/max(im.size)
  if s<1:im=im.resize((max(1,round(im.width*s)),max(1,round(im.height*s))),Image.LANCZOS)
  im.save(f'{OUT}/{folder}/'+os.path.basename(p))
  print(folder,os.path.basename(p),im.size)
