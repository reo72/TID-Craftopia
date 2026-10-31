# The title rank badges (asked 2026-10-27, pictures from the user in tools/title-ranks/rank_<n>.webp:
# 1 ブロンズ 2 シルバー 3 ゴールド 4 エピック 5 レジェンド 6 アセンデッド): cropped to the badge, made square and scaled
# to textures/cooptown/titles/rank_<n>.png (SIZE px). Faint edge pixels are dropped. Run from the CoopTown_RP folder:
#   python -P tools/build-title-ranks.py
from PIL import Image
SIZE=128
for n in range(1,7):
 im=Image.open(f'tools/title-ranks/rank_{n}.webp').convert('RGBA')
 px=im.load()
 for y in range(im.height):
  for x in range(im.width):
   r,g,b,a=px[x,y]
   if a<96 or (a<255 and r>235 and g>235 and b>235):px[x,y]=(0,0,0,0)
 im=im.crop(im.getbbox());s=max(im.size);sq=Image.new('RGBA',(s,s),(0,0,0,0));sq.paste(im,((s-im.width)//2,(s-im.height)//2))
 sq.resize((SIZE,SIZE),Image.LANCZOS).save(f'textures/cooptown/titles/rank_{n}.png');print('rank',n)
