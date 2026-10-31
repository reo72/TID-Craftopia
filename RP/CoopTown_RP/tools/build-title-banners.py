# The title notification banners (asked 2026-10-27, the user's pictures tools/title-banners/banner_<n>.webp for
# 1 ブロンズ 2 シルバー 3 ゴールド 4 エピック 5 レジェンド): the big rank word in the middle is painted over with the
# parchment (the HUD writes the title's name there, BP notify.js kinds 5-10), cropped and scaled to
# textures/cooptown/notify/title_<n>.png. 6 アセンデッド is made from the レジェンド one in icy colours with its badge.
# The middle zone of each (for the HUD text, tools/build-hud-log.mjs TITLE_ZONES) is printed and written to
# tools/title-banners/zones.json. Run from the CoopTown_RP folder:  python -P tools/build-title-banners.py
from PIL import Image
import colorsys,json
# the rank word on each picture (pixels of the 2000 x 667 source): x0, y0, x1, y1
WORDS={1:(928,269,1466,390),2:(956,259,1508,392),3:(742,258,1372,411),4:(691,270,1410,416),5:(806,302,1534,442)}
PAD=24;OUT_W=880
def clean(im):
 px=im.load()
 for y in range(im.height):
  for x in range(im.width):
   r,g,b,a=px[x,y]
   if a<96:px[x,y]=(0,0,0,0)
 return im
def parchment(im,box):
 x0,y0,x1,y1=box;px=im.load();mid=(y0+y1)//2
 light=sorted([px[x,mid][:3] for x in range(max(0,x0-300),min(im.width,x1+300),4) if sum(px[x,mid][:3])>640 and px[x,mid][3]>200],key=sum)
 return light[len(light)//2]
def icy(im):
 px=im.load()
 for y in range(im.height):
  for x in range(im.width):
   r,g,b,a=px[x,y]
   if not a:continue
   h,s,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
   if s<.22:continue # parchment, outlines
   nh=.55 if (h<.12 or h>.9) else .5 # reds -> blue, golds -> cyan
   nr,ng,nb=colorsys.hsv_to_rgb(nh,s*.55,min(1,v*1.12+.08))
   px[x,y]=(int(nr*255),int(ng*255),int(nb*255),a)
 return im
zones={}
for n in range(1,7):
 src=5 if n==6 else n
 im=clean(Image.open(f'tools/title-banners/banner_{src}.webp').convert('RGBA'))
 x0,y0,x1,y1=WORDS[src];box=(x0-PAD,y0-PAD//2,x1+PAD,y1+PAD//2)
 col=parchment(im,WORDS[src]);im.paste(col+(255,),box)
 if n==6:
  im=icy(im)
  # the badge: the アセンデッド one on the square's own background
  im.paste((24,44,86,255),(150,190,505,540)) # a deep blue square under the badge
  badge=Image.open('textures/cooptown/titles/rank_6.png').convert('RGBA').resize((330,330),Image.LANCZOS)
  im.alpha_composite(badge,(325-165,365-165))
 bb=im.getbbox();im=im.crop(bb)
 zones[n]={'x':round((box[0]-bb[0])/im.width,4),'y':round((box[1]-bb[1])/im.height,4),'w':round((box[2]-box[0])/im.width,4),'h':round((box[3]-box[1])/im.height,4),'aspect':round(im.width/im.height,4)}
 im.resize((OUT_W,round(OUT_W*im.height/im.width)),Image.LANCZOS).save(f'textures/cooptown/notify/title_{n}.png');print('banner',n,zones[n])
json.dump(zones,open('tools/title-banners/zones.json','w'),indent=1)
