# The profile icon (book settings: プロフィール row; asked 2026-10-27): a gold-trimmed card with a face and info
# lines, 32 x 32 pixel art scaled to textures/cooptown/book/icons/profile.png (128 px). Run from the CoopTown_RP
# folder:  python -P tools/build-profile-icon.py
from PIL import Image,ImageDraw
im=Image.new('RGBA',(32,32),(0,0,0,0));d=ImageDraw.Draw(im)
OUT=(50,30,15);GOLD=(232,180,60);GOLD_D=(170,115,30);PAPER=(244,230,196);PAPER_D=(220,200,160)
d.rectangle([1,5,30,26],fill=OUT);d.rectangle([2,6,29,25],fill=GOLD);d.rectangle([3,7,28,24],fill=GOLD_D);d.rectangle([4,8,27,23],fill=PAPER)
d.line([(4,23),(27,23)],fill=PAPER_D)
# the portrait: a framed face (hair, eyes) on blue
d.rectangle([6,10,15,21],fill=OUT);d.rectangle([7,11,14,20],fill=(110,170,220))
SKIN=(236,190,150);HAIR=(110,70,40)
d.rectangle([8,12,13,17],fill=SKIN);d.rectangle([8,12,13,13],fill=HAIR);d.point((8,14),fill=HAIR);d.point((13,14),fill=HAIR)
d.point((9,15),fill=(40,50,90));d.point((12,15),fill=(40,50,90));d.line([(10,17),(11,17)],fill=(190,120,100))
d.rectangle([8,18,13,20],fill=(70,120,60)) # shoulders
# info lines
for y,w in ((12,9),(15,7),(18,9)):d.line([(18,y),(18+w-1,y)],fill=(140,95,55))
d.point((18,21),fill=GOLD_D);d.line([(19,21),(23,21)],fill=GOLD)
# a small gold star badge on the corner
for p in ((26,4),(25,5),(26,5),(27,5),(26,6)):d.point(p,fill=(255,225,90))
im.resize((128,128),Image.NEAREST).save('textures/cooptown/book/icons/profile.png');print('drew profile')
