# One picture and a zip of the item pictures drawn by code (not the user's art): the job tools
# (build-job-tools.py), the watering cans (build-watering-can.py) and the frying pans' icons (build-frying-pan.py).
# Writes tools/generated_items/items_sheet.png and items.zip. Run from the CoopTown_RP folder:
#   python -P tools/build-generated-sheet.py
import json,os,zipfile,sys
from PIL import Image,ImageDraw,ImageFont
BP=os.path.join('..','..','development_behavior_packs','CoopTown_BP')
names={}
for f in os.listdir(os.path.join(BP,'items','job_tools'))+['../watering_can_copper.json','../watering_can_iron.json','../watering_can_gold.json','../watering_can_master.json']+[f'../frying_pan/frying_pan_{n}.json' for n in (1,2,3)]:
 p=os.path.normpath(os.path.join(BP,'items','job_tools',f))
 j=json.load(open(p,encoding='utf8'))['minecraft:item'];names[j['description']['identifier'].split(':')[1]]=j['components']['minecraft:display_name']['value']
items=[k for k in names if os.path.exists(f'textures/cooptown/items/{k}.png')]
COLS,CELL,H=6,170,200
sheet=Image.new('RGBA',(COLS*CELL,((len(items)+COLS-1)//COLS)*H),(48,44,52,255));d=ImageDraw.Draw(sheet);font=ImageFont.truetype('C:/Windows/Fonts/meiryob.ttc',15)
zf=zipfile.ZipFile('tools/generated_items/items.zip','w',zipfile.ZIP_DEFLATED)
for i,k in enumerate(items):
 im=Image.open(f'textures/cooptown/items/{k}.png').convert('RGBA');zf.write(f'textures/cooptown/items/{k}.png',f'{k}.png')
 big=im.resize((128,128),Image.NEAREST);x,y=(i%COLS)*CELL,(i//COLS)*H;sheet.paste(big,(x+21,y+10),big)
 d.text((x+CELL//2,y+160),names[k],font=font,fill=(240,230,210),anchor='mm');d.text((x+CELL//2,y+180),k,font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',11),fill=(170,160,150),anchor='mm')
zf.close();sheet.save('tools/generated_items/items_sheet.png');print(len(items),'items')
