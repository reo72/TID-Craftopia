# Draws the wardrobe skins (BP scripts/wardrobe.js, property cooptown:skin 1..8): textures/cooptown/skins/<name>.png,
# 64 x 64 classic (wide-arm) skin layout, one outfit per job and a traveller. Run from the CoopTown_RP folder:
#   python -P tools/build-skins.py
from PIL import Image
import os
os.makedirs('textures/cooptown/skins',exist_ok=True)
SKIN=(236,190,150);SKIN_D=(212,160,120);EYE=(40,50,90);WHITE=(245,245,245);MOUTH=(170,100,90)
# box parts: name -> (u, v, w, h, d): the standard cube unwrap at (u, v) for a w x h x d box
PARTS={'head':(0,0,8,8,8),'hat':(32,0,8,8,8),'body':(16,16,8,12,4),'jacket':(16,32,8,12,4),
 'rarm':(40,16,4,12,4),'rsleeve':(40,32,4,12,4),'larm':(32,48,4,12,4),'lsleeve':(48,48,4,12,4),
 'rleg':(0,16,4,12,4),'rpants':(0,32,4,12,4),'lleg':(16,48,4,12,4),'lpants':(0,48,4,12,4)}
def faces(u,v,w,h,d):
 # (face, x0, y0, width, height)
 return [('top',u+d,v,w,d),('bottom',u+d+w,v,w,d),('right',u,v+d,d,h),('front',u+d,v+d,w,h),('left',u+d+w,v+d,d,h),('back',u+d+w+d,v+d,w,h)]
def paint(px,part,fn):
 u,v,w,h,d=PARTS[part]
 for face,x0,y0,fw,fh in faces(u,v,w,h,d):
  for y in range(fh):
   for x in range(fw):
    c=fn(face,x,y,fw,fh)
    if c:px[x0+x,y0+y]=c+(255,) if len(c)==3 else c
def outfit(name,hair,shirt,pants,shoes,extra=None,hat=None):
 im=Image.new('RGBA',(64,64),(0,0,0,0));px=im.load()
 def head(face,x,y,w,h):
  if face=='top':return hair
  if face=='bottom':return SKIN_D
  if face=='back':return hair if y<6 else SKIN_D
  if face in('left','right'):return hair if y<3 or (face=='right' and x<2 and y<5) or (face=='left' and x>5 and y<5) else SKIN
  if y<2:return hair
  if y==4 and x in(1,6):return WHITE
  if y==4 and x in(2,5):return EYE
  if y==6 and 3<=x<=4:return MOUTH
  return SKIN
 paint(px,'head',head)
 paint(px,'body',lambda f,x,y,w,h:shirt if f!='bottom' else pants)
 arm=lambda f,x,y,w,h:shirt if y<5 or f=='top' else SKIN_D if f=='bottom' else SKIN
 paint(px,'rarm',arm);paint(px,'larm',arm)
 leg=lambda f,x,y,w,h:shoes if y>=9 or f=='bottom' else pants
 paint(px,'rleg',leg);paint(px,'lleg',leg)
 if extra:extra(px)
 if hat:paint(px,'hat',hat)
 im.save(f'textures/cooptown/skins/{name}.png');print('drew',name)
def belt(col):
 def f(px):paint(px,'jacket',lambda face,x,y,w,h:col if y==8 and face!='top' and face!='bottom' else None)
 return f
def apron(col,tie=None):
 def f(px):
  paint(px,'jacket',lambda face,x,y,w,h:col if face=='front' and 1<=x<=6 and y>=2 else (tie if tie and y==3 and face in('left','right','back') else None))
  paint(px,'rpants',lambda face,x,y,w,h:col if face=='front' and y<6 else None);paint(px,'lpants',lambda face,x,y,w,h:col if face=='front' and y<6 else None)
 return f
def both(*fs):
 def f(px):
  for g in fs:g(px)
 return f
STRAW=(225,195,110);STRAW_D=(185,150,70)
outfit('farmer',(110,70,40),(200,60,60),(60,90,170),(90,60,40),
 extra=apron((60,90,170)),hat=lambda f,x,y,w,h:STRAW if f=='top' or (y<3 and f!='bottom') else (STRAW_D if y==3 and f!='bottom' else None))
outfit('fisher',(50,40,30),(240,200,60),(70,80,90),(50,50,60),
 extra=both(apron((250,210,70)),belt((60,60,60))),hat=lambda f,x,y,w,h:(250,210,70) if f=='top' or (y<2 and f!='bottom') else None)
outfit('smith',(40,30,25),(120,120,130),(60,55,50),(40,35,30),extra=apron((120,80,45),(90,60,30)))
outfit('cook',(90,60,40),WHITE,(50,50,60),(40,40,45),extra=apron((235,235,235),(200,200,200)),
 hat=lambda f,x,y,w,h:WHITE if f=='top' or (y<3 and f!='bottom') else None)
outfit('alchemist',(60,110,80),(70,150,110),(50,70,60),(60,45,35),extra=both(apron((230,240,235)),belt((140,90,40))))
outfit('enchanter',(170,170,200),(80,50,140),(60,40,100),(40,30,60),
 extra=both(belt((230,190,60)),lambda px:paint(px,'jacket',lambda f,x,y,w,h:(230,190,60) if f=='front' and x in(3,4) else None)),
 hat=lambda f,x,y,w,h:(80,50,140) if f=='top' or (y<2 and f!='bottom') else None)
outfit('adventurer',(120,80,40),(70,110,60),(110,85,60),(70,50,35),extra=both(belt((90,60,30)),lambda px:paint(px,'jacket',lambda f,x,y,w,h:(90,60,30) if f in('front','back') and x==y%8 else None)))
outfit('traveler',(200,170,120),(150,110,80),(90,80,70),(60,45,35),
 extra=belt((60,40,25)),hat=lambda f,x,y,w,h:(120,90,60) if f=='top' or (y<2 and f!='bottom') else None)
