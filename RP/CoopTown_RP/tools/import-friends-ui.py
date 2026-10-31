# Imports the user's フレンド page pictures (TID_Craftopia_Friends_Book_UI_Assets.zip, folder Friends_Book_UI; asked
# 2026-10-28: use what the page needs) into textures/cooptown/friends/: cropped, scaled down, and the frames get a
# nineslice .json so they stretch without bending the corners. The selected / pressed / disabled pictures came out
# nearly the same as the plain ones, so those states are tinted here (selected green like the book's other pages,
# pressed a little darker, disabled faded). Not used: book (the book has its frame), close, home (its bookmarks).
# Run from the CoopTown_RP folder:  python -P tools/import-friends-ui.py <path to Friends_Book_UI>
import sys,os,json
from PIL import Image,ImageEnhance
SRC=sys.argv[1];OUT='textures/cooptown/friends';os.makedirs(OUT,exist_ok=True)
def load(name):
 im=Image.open(os.path.join(SRC,name)).convert('RGBA');px=im.load()
 for y in range(im.height):
  for x in range(im.width):
   if px[x,y][3]<100:px[x,y]=(0,0,0,0)
 return im.crop(im.getbbox())
def scaled(im,h):return im.resize((max(1,round(im.width*h/im.height)),h),Image.LANCZOS)
def tint(im,rgb,amount):
 # mix the parchment toward a colour, keeping the gold frame (only light, low-saturation pixels)
 out=im.copy();px=out.load()
 for y in range(out.height):
  for x in range(out.width):
   r,g,b,a=px[x,y]
   if a and r>215 and g>190:px[x,y]=(round(r+(rgb[0]-r)*amount),round(g+(rgb[1]-g)*amount),round(b+(rgb[2]-b)*amount),a)
 return out
# the game draws a nineslice's corners at base_size units (GUI pixels): the pictures are four times finer than the
# book's GUI pixels, so base_size and the corners are a quarter of the picture (2026-10-28: full-size corners covered
# the labels of the small tabs and the search bar)
GUI_DIV=4
def save(im,name,nine=None):
 im.save(f'{OUT}/{name}.png')
 if nine:json.dump({'nineslice_size':[round(n/GUI_DIV,1) for n in nine],'base_size':[round(im.width/GUI_DIV,1),round(im.height/GUI_DIV,1)]},open(f'{OUT}/{name}.json','w'))
 print(name,im.size,nine or '')
GREEN=(196,224,160)
# frames (height 96; corners ~22 px)
row=scaled(load('frames/row.png'),96);save(row,'row',[24,22,24,22]);save(tint(row,GREEN,.55),'row_selected',[24,22,24,22])
btn=scaled(load('buttons/normal.png'),96);save(btn,'button',[26,24,26,24])
save(ImageEnhance.Brightness(scaled(load('buttons/pressed.png'),96)).enhance(.9),'button_pressed',[26,24,26,24])
dis=scaled(load('buttons/disabled.png'),96);dis=ImageEnhance.Color(dis).enhance(.35);dis.putalpha(dis.getchannel('A').point(lambda a:int(a*.75)));save(dis,'button_disabled',[26,24,26,24])
save(tint(btn,GREEN,.55),'button_selected',[26,24,26,24])
save(scaled(load('frames/search.png'),80),'search',[22,20,22,20])
rib=scaled(load('frames/title_ribbon.png'),96);save(rib,'title_ribbon',[rib.height,22,24,22]) # the medal end stays whole
save(scaled(load('frames/portrait.png'),256),'portrait',[34,34,34,34])
# buttons and icons (squares)
for n in ('previous','next'):save(scaled(load(f'buttons/{n}.png'),96),n)
for n in ('chat','online','offline','friends','add_friend','search','profile'):save(scaled(load(f'icons/{n}.png'),96),'i_'+n)
