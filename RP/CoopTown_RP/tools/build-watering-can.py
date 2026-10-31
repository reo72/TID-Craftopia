# Draws the farmer's watering cans (BP scripts/watering.js): textures/cooptown/items/watering_can_<tier>.png, 32 x 32
# pixel art, one per metal. Run: python tools/build-watering-can.py   (from the CoopTown_RP folder)
import os
from PIL import Image
# metal: light, mid, dark, outline
METALS={'copper':[(240,160,110),(205,110,70),(150,70,45),(70,35,25)],
        'iron':[(235,235,240),(190,192,200),(130,134,145),(50,52,60)],
        'gold':[(255,240,140),(245,200,60),(190,135,25),(90,60,10)],
        'master':[(170,255,230),(60,210,170),(25,140,120),(10,60,55)]}
WATER=(90,170,240)
# 32 x 32 map: . empty, O outline, L light, M mid, D dark, W water drop
ART=[
"................................",
"................................",
"..........OOOOOOOO..............",
".........OLLLLLLLLO.............",
"........OLO......OLO............",
"........OMO......OMO............",
"........OMO......OMO.........OO.",
".......OOOOOOOOOOOOOOO......OLLO",
"......OLLLLLLLLLLLLLLLO....OLMMO",
".....OLLMMMMMMMMMMMMMMDO..OLMMO.",
".....OLMMMMMMMMMMMMMMMDO.OLMMO..",
".....OLMMMMMMMMMMMMMMMDOOLMMO...",
".....OLMMMMMMMMMMMMMMMDOLMMO....",
".....OLMMMMMMMMMMMMMMMDLMMO.....",
".....OLMMMMMMMMMMMMMMMDMMO......",
".....OLMMMMMMMMMMMMMMMDMO.......",
".....OLMMMMMMMMMMMMMMMDO........",
".....OLMMMMMMMMMMMMMMMDO........",
".....OLMMMMMMMMMMMMMMMDO........",
".....OLMMMMMMMMMMMMMMMDO........",
".....OLMMMMMMMMMMMMMMMDO........",
".....OLMMMMMMMMMMMMMMMDO........",
".....OLDDDDDDDDDDDDDDDDO........",
"......ODDDDDDDDDDDDDDDO.........",
".......OOOOOOOOOOOOOOO..........",
"................................",
"................................",
"................................",
"................................",
"................................",
"................................",
"................................"]
for name,(l,m,d,o) in METALS.items():
 im=Image.new('RGBA',(32,32),(0,0,0,0));px=im.load()
 for y,row in enumerate(ART):
  for x,c in enumerate(row):
   col={'O':o,'L':l,'M':m,'D':d,'W':WATER}.get(c)
   if col:px[x,y]=col+(255,)
 # a band round the middle of the body (rim of the metal)
 for x in range(7,22):
  if px[x,15][3]:px[x,15]=d+(255,)
 # drops falling from the spout tip
 for x,y in [(30,11),(31,13),(30,15),(31,17)]:px[x,y]=WATER+(255,)
 if os.path.exists(f'tools/assets/job_tools/watering_can_{name}.webp'):print('kept the drawn art',name);continue  # the user's art
 im.save(f'textures/cooptown/items/watering_can_{name}.png');print('drew',name)
