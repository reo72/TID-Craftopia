# Draws the job tools' pictures (BP scripts/job-tools-config.js): textures/cooptown/items/<name>.png, 32 x 32 pixel
# art. Shapes are drawn without smoothing, then every picture gets a dark outline. Run from the CoopTown_RP folder:
#   python -P tools/build-job-tools.py
import os
from PIL import Image, ImageDraw
OUT='textures/cooptown/items/'
WOOD=(150,100,55);WOOD_L=(190,135,80);WOOD_D=(105,68,35)
IRON=(205,208,215);IRON_L=(240,240,245);IRON_D=(130,134,145)
GOLD=(245,200,60);GOLD_L=(255,240,140);GOLD_D=(190,135,25)
LEATHER=(150,90,50);LEATHER_L=(185,120,70);LEATHER_D=(105,60,30)

def new():
 im=Image.new('RGBA',(32,32),(0,0,0,0));return im,ImageDraw.Draw(im)
def outline(im,col=(40,28,20)):
 px=im.load();w,h=im.size;edge=[]
 for y in range(h):
  for x in range(w):
   if px[x,y][3]:continue
   if any(0<=x+dx<w and 0<=y+dy<h and px[x+dx,y+dy][3]==255 for dx,dy in ((1,0),(-1,0),(0,1),(0,-1))):edge.append((x,y))
 for x,y in edge:px[x,y]=col+(255,)
 return im
def diag(d,x0,y0,x1,y1,col,w=2):
 d.line([(x0,y0),(x1,y1)],fill=col,width=w)
def save(im,name):
 if os.path.exists(f'tools/assets/job_tools/{name}.webp'):print('kept the drawn art',name);return  # the user's art (import-job-tool-art.py)
 outline(im).save(OUT+name+'.png');print('drew',name)

def brush(gold=False):
 im,d=new();m,l,dk=(GOLD,GOLD_L,GOLD_D) if gold else (WOOD,WOOD_L,WOOD_D)
 d.rounded_rectangle([6,9,25,16],radius=3,fill=m);d.line([(8,10),(23,10)],fill=l);d.line([(7,15),(24,15)],fill=dk)
 for x in range(7,25,2):d.line([(x,17),(x,22)],fill=(235,225,200) if x%4 else (200,185,150))
 d.rectangle([13,5,18,8],fill=dk)
 if gold:
  for p in [(4,4),(27,5),(26,24)]:d.point(p,fill=(255,255,200))
 return im
def bait(base,spot):
 im,d=new();d.ellipse([7,9,24,24],fill=base);d.ellipse([10,11,16,16],fill=tuple(min(255,c+50) for c in base))
 for p in spot:d.ellipse([p[0],p[1],p[0]+2,p[1]+2],fill=tuple(max(0,c-60) for c in base))
 return im
def lure():
 im,d=new();d.polygon([(6,16),(14,9),(25,12),(27,16),(25,20),(14,23)],fill=GOLD);d.line([(9,15),(24,13)],fill=GOLD_L)
 d.polygon([(25,16),(30,11),(30,21)],fill=(90,200,220));d.ellipse([9,14,12,17],fill=(30,30,40))
 d.line([(17,23),(19,28)],fill=IRON_D);d.arc([16,26,22,31],0,180,fill=IRON_D)
 for p in [(4,6),(27,4)]:d.point(p,fill=(255,255,210))
 return im
def basket():
 im,d=new();d.polygon([(7,10),(24,10),(22,27),(9,27)],fill=(195,160,90))
 for y in range(12,27,3):d.line([(8,y),(23,y)],fill=(150,115,60))
 for x in range(10,23,4):d.line([(x,10),(x+1,27)],fill=(170,135,75))
 d.rectangle([6,8,25,10],fill=(150,115,60));d.arc([10,2,21,14],180,360,fill=(130,95,50),width=2)
 d.polygon([(15,6),(20,4),(19,9)],fill=(90,160,220))
 return im
def hammer():
 im,d=new();diag(d,8,26,19,13,WOOD,3);d.polygon([(14,6),(22,2),(29,13),(21,17)],fill=IRON)
 d.line([(15,6),(22,3)],fill=IRON_L,width=2);d.line([(21,16),(28,12)],fill=IRON_D,width=2)
 return im
def whetstone():
 im,d=new();d.polygon([(5,18),(13,11),(27,13),(26,19),(17,25),(6,23)],fill=(150,150,160))
 d.line([(8,18),(14,13),(25,15)],fill=(200,200,210));d.line([(8,22),(17,23),(25,18)],fill=(105,105,115))
 for p in [(20,8),(23,6),(17,7)]:d.point(p,fill=(255,255,255))
 return im
def knife(blade=IRON,handle=WOOD_D,short=False):
 im,d=new();d.polygon([(5,26),(8,29),(13,24),(10,21)],fill=handle)
 tip=(22,8) if short else (27,4)
 d.polygon([(11,20),(14,23),(tip[0]+1,tip[1]+6),tip],fill=blade);d.line([(12,20),tip],fill=IRON_L)
 return im
def herb_knife():
 im=knife(blade=(160,205,170),handle=(70,110,60),short=True);d=ImageDraw.Draw(im)
 d.ellipse([22,18,27,23],fill=(80,170,70));d.ellipse([25,22,29,27],fill=(60,140,55))
 return im
def cool_bag():
 im,d=new();d.rounded_rectangle([5,10,26,27],radius=3,fill=(80,150,215));d.rectangle([5,10,26,13],fill=(60,120,185))
 d.arc([10,3,21,14],180,360,fill=(50,95,150),width=2)
 for p in [(15,19),(13,17),(17,17),(13,21),(17,21),(15,16),(15,22)]:d.point(p,fill=(240,250,255))
 return im
def potion_holder():
 im,d=new();d.rectangle([4,18,27,22],fill=WOOD);d.line([(4,18),(27,18)],fill=WOOD_L)
 for x,col in [(6,(220,60,70)),(13,(80,170,240)),(20,(150,220,90))]:
  d.rectangle([x,8,x+4,25],fill=(225,235,240));d.rectangle([x+1,15,x+3,24],fill=col);d.rectangle([x,6,x+4,7],fill=WOOD_D)
 d.rectangle([4,22,27,26],fill=WOOD_D)
 return im
def lupe():
 im,d=new();diag(d,6,27,14,19,(110,60,150),4);d.ellipse([11,4,28,21],fill=GOLD);d.ellipse([14,7,25,18],fill=(160,215,250))
 d.arc([15,8,23,16],200,260,fill=(240,250,255),width=2)
 for p in [(19,12),(21,10)]:d.point(p,fill=(190,120,240))
 return im
def pen():
 im,d=new();d.polygon([(6,27),(9,26),(26,7),(24,5)],fill=(40,70,170));d.polygon([(24,5),(29,2),(26,7)],fill=GOLD)
 d.polygon([(4,30),(6,27),(9,26)],fill=(30,30,40));d.polygon([(14,16),(26,4),(29,10),(18,18)],fill=(240,240,245));d.line([(16,16),(27,6)],fill=(200,200,210))
 return im
def map_pin():
 im,d=new();d.rectangle([3,12,25,28],fill=(235,220,170));d.line([(3,20),(25,20)],fill=(200,180,130));d.line([(14,12),(14,28)],fill=(200,180,130))
 d.line([(6,25),(10,17),(17,24),(22,15)],fill=(110,170,90))
 d.line([(21,13),(21,22)],fill=IRON_D,width=1);d.ellipse([17,3,26,12],fill=(220,50,50));d.ellipse([19,5,21,7],fill=(255,170,170))
 return im
def lantern():
 im,d=new();d.arc([11,1,20,10],180,360,fill=IRON_D,width=2);d.rectangle([9,7,22,10],fill=(70,70,80))
 d.rectangle([10,11,21,25],fill=(255,190,70));d.rectangle([13,14,18,22],fill=(255,240,170))
 for x in (10,15,21):d.line([(x,11),(x,25)],fill=(70,70,80))
 d.rectangle([9,26,22,28],fill=(70,70,80))
 return im
def planting_bag():
 im,d=new();d.polygon([(8,12),(23,12),(26,27),(5,27)],fill=LEATHER);d.line([(9,13),(22,13)],fill=LEATHER_L)
 d.rectangle([9,10,22,12],fill=LEATHER_D);d.line([(15,4),(15,11)],fill=(90,140,50),width=2)
 d.ellipse([9,3,15,8],fill=(80,170,60));d.ellipse([15,1,22,7],fill=(100,190,70))
 d.ellipse([12,18,19,24],fill=(90,140,50))
 return im

ITEMS={'animal_brush':brush(),'animal_brush_gold':brush(True),
 'bait_river':bait((200,170,100),[(12,18),(18,14),(20,20)]),'bait_sea':bait((80,140,110),[(11,17),(18,13),(19,20)]),
 'bait_night':bait((120,80,110),[(12,18),(18,14),(19,19)]),'bait_legend':lure(),'fish_basket':basket(),
 'smith_hammer':hammer(),'whetstone':whetstone(),'cook_knife':knife(),'cool_bag':cool_bag(),'herb_knife':herb_knife(),
 'potion_holder':potion_holder(),'mana_lupe':lupe(),'rune_pen':pen(),'map_pin':map_pin(),'miner_lantern':lantern(),'planting_bag':planting_bag()}

# 極み (Lv.50): the same shapes in finer colours, with sparkles
def sparkle(im,pts=((3,3),(28,4),(27,27))):
 d=ImageDraw.Draw(im)
 for x,y in pts:
  d.point((x,y),fill=(255,255,255))
  for q in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):d.point(q,fill=(200,240,255))
 return im
def recolor(im,mapping):
 px=im.load()
 for y in range(32):
  for x in range(32):
   c=px[x,y]
   if c[3] and c[:3] in mapping:px[x,y]=mapping[c[:3]]+(255,)
 return im
def master_lure():
 im=lure();return sparkle(recolor(im,{GOLD:(170,90,230),GOLD_L:(220,170,255),(90,200,220):(255,220,90)}))
def master_hammer():
 im=hammer();return sparkle(recolor(im,{IRON:(70,62,70),IRON_L:(120,110,120),IRON_D:(40,35,40),WOOD:GOLD}))
def master_knife():
 im=knife(blade=(120,230,235));return sparkle(recolor(im,{WOOD_D:(60,40,90)}))
def master_herb_knife():
 im=herb_knife();return sparkle(recolor(im,{(160,205,170):(60,220,120),(70,110,60):GOLD_D}))
def master_pen():
 im=pen();return sparkle(recolor(im,{(40,70,170):(120,40,170),(240,240,245):(255,230,150)}))
def master_lantern():
 im=lantern();return sparkle(recolor(im,{(255,190,70):(90,220,255),(255,240,170):(210,250,255),(70,70,80):GOLD_D}))
ITEMS.update({'bait_master':master_lure(),'master_hammer':master_hammer(),'master_knife':master_knife(),'master_herb_knife':master_herb_knife(),'master_pen':master_pen(),'master_lantern':master_lantern()})
for name,im in ITEMS.items():save(im,name)
