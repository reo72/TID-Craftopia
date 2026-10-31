# Rough preview of a CoopTown form screen from its generated JSON UI (ui/<file>.json), with sample button texts, for
# checking positions and text sizes without the game. Handles what the builders use: panels / images / labels,
# percent sizes and offsets, anchors, collection_index readouts, mark conditions, factory stacks (unscrolled).
# Text size: GUI px = 8 * font_scale_factor (the pixel font), on a GUI screen of SCREEN px.
# Run: python tools/preview-ui.py <ui json> <root control> <samples json> <out png> [screen w] [screen h]
#   samples json: {"title": "ct:...", "buttons": [[text, icon or null], ...]}
import json,re,sys
from PIL import Image,ImageDraw,ImageFont
RP='.';UIFILE,ROOT,SAMPLES,OUT=sys.argv[1:5]
SW,SH=(int(sys.argv[5]),int(sys.argv[6])) if len(sys.argv)>6 else (427,240)
K=4 # output px per GUI px
ui=json.load(open(UIFILE,encoding='utf8'));ns=ui['namespace'];S=json.load(open(SAMPLES,encoding='utf8'))
buttons=S['buttons'];title=S.get('title','')
img=Image.new('RGBA',(SW*K,SH*K),(70,60,48,255))
FONT=lambda px:ImageFont.truetype('C:/Windows/Fonts/meiryob.ttc',max(6,int(px)))

def lookup(name):
  if '.' in name:n,c=name.split('.',1);return ui[c] if n==ns else {}
  return ui[name]
def resolve(key,node):
  # "name@ns.base": merge base under node
  if '@' in key:
    name,base=key.split('@',1)
    if base.startswith(ns+'.'):b=resolve_base(base);m=dict(b);m.update(node);return name,m
    return name,dict(node,type=node.get('type','panel'),_external=base)
  return key,node
def resolve_base(base):
  n=base.split('.',1)[1];k=[x for x in ui if x==n or x.startswith(n+'@')]
  return ui[k[0]] if k else {}
def num(v,ref,other=None,children=None):
  if isinstance(v,(int,float)):return v*K
  v=str(v).strip()
  total=0
  for term in re.findall(r'[+-]?\s*[\d.]+(?:%y|%x|%c|%cm|%sm|%|px)?|default',v):
    t=term.replace(' ','')
    if t=='default':return None
    m=re.match(r'([+-]?[\d.]+)(.*)',t);x=float(m.group(1));u=m.group(2)
    if u=='%':total+=x/100*ref
    elif u=='%y':total+=x/100*(other if other is not None else ref)
    elif u in('px',''):total+=x*K
    elif u in('%c','%cm','%sm'):total+=x/100*(children or 0)
  return total
TEXT_RE=re.compile(r"\(not \(\(#form_button_text - '([^']*)'\) = #form_button_text\)\)")
def evaluate(expr,text):
  e=TEXT_RE.sub(lambda m:' True ' if m.group(1) in text else ' False ',expr)
  e=re.sub(r"\(\(#form_button_text - '([^']*)'\) = #form_button_text\)",lambda m:' True ' if m.group(1) not in text else ' False ',e)
  e=e.replace("(not (#form_button_text = ''))",' True ' if text else ' False ').replace("(#form_button_text = '')",' True ' if not text else ' False ')
  e=re.sub(r"\(#title_text = '([^']*)'\)",lambda m:' True ' if m.group(1)==title else ' False ',e)
  e=re.sub(r"\(not \(#texture = ''\)\)",' True ',e)
  try:return bool(eval(e))
  except Exception:return True
def visible(node,ctx):
  for b in node.get('bindings',[]):
    if b.get('target_property_name')=='#visible':
      if not evaluate(b['source_property_name'],ctx['text']):return False
  return node.get('visible',True)
MARKS=re.compile(r"\[[a-z_0-9]+\]|^[a-z]\||§.")
def clean(t):
  t=re.sub(r'\[[a-z_0-9]+\]','',t);t=re.sub(r'^[a-z]:?[a-z]*\|','',t);return t
def place(node,parent,ctx):
  px,py,pw,ph=parent
  size=node.get('size',['100%','100%'])
  h=num(size[1],ph,children=ctx.get('ch'))
  w=num(size[0],pw,other=h)
  if h is None:h=0
  if w is None:w=pw
  af=node.get('anchor_from','center');at=node.get('anchor_to',af)
  def anchor(a,x,y,w,h):
    ax={'left':0,'right':1}.get(next((p for p in ('left','right') if p in a),None),.5)
    ay={'top':0,'bottom':1}.get(next((p for p in ('top','bottom') if p in a),None),.5)
    if a=='center':ax=ay=.5
    return x+ax*w,y+ay*h
  fx,fy=anchor(af,px,py,pw,ph)
  off=node.get('offset',[0,0]);ox=num(off[0],pw) or 0;oy=num(off[1],ph) or 0
  tx,ty=anchor(at,0,0,w,h)
  return (fx+ox-tx,fy+oy-ty,w,h)
TEX={}
def texture(path):
  if path not in TEX:
    try:TEX[path]=Image.open(f'{RP}/{path}.png').convert('RGBA')
    except Exception:TEX[path]=None
  return TEX[path]
def draw_image(node,r,ctx):
  path=node.get('texture');
  if path=='#texture':path=ctx.get('icon')
  t=texture(path) if path else None
  if t is None or r[2]<1 or r[3]<1:return
  x,y,w,h=r
  if node.get('keep_ratio'):
    s=min(w/t.width,h/t.height);nw,nh=t.width*s,t.height*s;x+=(w-nw)/2;y+=(h-nh)/2;w,h=nw,nh
  i=t.resize((max(1,int(w)),max(1,int(h))),Image.LANCZOS)
  c=node.get('color');a=node.get('alpha',1)
  if c or a!=1:
    c=c or [1,1,1];ch=i.split();rgb=[ch[k].point(lambda v,f=c[k]:int(v*f)) for k in range(3)];al=ch[3].point(lambda v:int(v*a))
    i=Image.merge('RGBA',rgb+[al])
  img.alpha_composite(i,(int(x),int(y)))
COLORS={'a':(85,255,85),'c':(255,85,85),'7':(170,170,170),'e':(255,255,85),'6':(255,170,0),'b':(85,255,255),'r':None}
def draw_label(node,r,ctx):
  text=node.get('text','')
  if text=='#text':text=clean(ctx['text'])
  if not text:return
  scale=node.get('font_scale_factor',1);px=8*scale*K
  d=ImageDraw.Draw(img);f=FONT(px);lines=text.split('\n');lh=px*1.25
  base=tuple(int(v*255) for v in node.get('color',[1,1,1]))
  x,y,w,h=r;bh=lh*len(lines)
  # label height is "default" (its text): place by its anchor inside the given box
  af=node.get('anchor_from','center');top=y+(h-bh)/2 if 'top' not in af else y
  align=node.get('text_alignment','center')
  for k,l in enumerate(lines):
    parts=re.split(r'(§.)',l);plain=re.sub(r'§.','',l)
    bb=d.textbbox((0,0),plain,font=f);tw=bb[2]-bb[0]
    lx=x if align=='left' else x+w-tw if align=='right' else x+(w-tw)/2
    if tw>w+2:d.rectangle((x,top+k*lh,x+w,top+(k+1)*lh),outline=(255,0,0),width=2)
    col=base;cx=lx
    for p in parts:
      if p.startswith('§'):c=COLORS.get(p[1:],base);col=c or base;continue
      if not p:continue
      if node.get('shadow'):d.text((cx+K,top+k*lh+K-bb[1]),p,font=f,fill=(30,25,20))
      d.text((cx,top+k*lh-bb[1]),p,font=f,fill=col);cx+=d.textlength(p,font=f)
def render(key,node,parent,ctx):
  if not isinstance(node,dict):return
  name,node=resolve(key,node)
  if '_external' in node and 'scrolling_panel' in node['_external']:
    content=node.get('$scrolling_content');r=place(node,parent,ctx)
    if content:render('content@'+content,{'anchor_from':'top_left','anchor_to':'top_left'},(r[0],r[1],r[2]-8*K,r[3]),ctx)
    return
  if 'collection_index' in node:ctx=dict(ctx,text=buttons[node['collection_index']][0] if node['collection_index']<len(buttons) else '',icon=(buttons[node['collection_index']][1] if node['collection_index']<len(buttons) and len(buttons[node['collection_index']])>1 else None))
  if not visible(node,ctx):return
  # a button: draw its default control only
  if node.get('_external')=='common.button' or name.endswith('button'):pass
  r=place(node,parent,ctx)
  t=node.get('type','panel')
  if t=='image':draw_image(node,r,ctx)
  elif t=='label':draw_label(node,r,ctx)
  if t=='stack_panel' and node.get('factory'):
    item=list(node['factory']['control_ids'].values())[0].lstrip('@')
    base=resolve_base(item);y=r[1]
    for i,b in enumerate(buttons):
      c=dict(ctx,text=b[0],icon=b[1] if len(b)>1 else None)
      if not visible(base,c):continue
      ir=place(dict(base,anchor_from='top_left',anchor_to='top_left'),(r[0],y,r[2],r[3]),c)
      for ch in base.get('controls',[]):
        for k2,v2 in ch.items():render(k2,v2,ir,c)
      y+=ir[3]
    return
  controls=node.get('controls',[])
  default=node.get('default_control')
  for ch in controls:
    for k2,v2 in ch.items():
      if default and k2.split('@')[0] in ('hover','pressed'):continue
      render(k2,v2,r,ctx)
root=ui[ROOT]
render(ROOT,root,(0,0,SW*K,SH*K),{'text':''})
img.save(OUT);print('wrote',OUT)
