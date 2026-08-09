#!/usr/bin/env python3
from pathlib import Path
import argparse,sys,math
from PIL import Image,ImageFilter,ImageChops,ImageDraw
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'));from freev_render import render_icon,fill,THEMES
from freev_registry import load_registry
DEFAULT={x['id']:x['animation'] for x in load_registry()['apps']}

def alpha(path):return Image.open(path).convert('RGBA').getchannel('A')
def layer_masks(app,size):
 ps=sorted((ROOT/'symbols'/'animation-layers'/app).glob('layer-*.png'))
 return [alpha(p).resize((size,size),Image.Resampling.LANCZOS) for p in ps]
def overlay(mask,color,opacity=235): return fill(mask,color,opacity)
def transform_crop(layer,mask,scale=1.0,dx=0,dy=0,rotate=0):
 bb=mask.getbbox()
 if not bb:return layer
 crop=layer.crop(bb);cx=(bb[0]+bb[2])//2;cy=(bb[1]+bb[3])//2
 if scale!=1:
  crop=crop.resize((max(1,int(crop.width*scale)),max(1,int(crop.height*scale))),Image.Resampling.LANCZOS)
 if rotate:crop=crop.rotate(rotate,resample=Image.Resampling.BICUBIC,expand=True)
 out=Image.new('RGBA',layer.size,(0,0,0,0));out.alpha_composite(crop,(int(cx-crop.width/2+dx),int(cy-crop.height/2+dy)));return out

ap=argparse.ArgumentParser();ap.add_argument('--app',required=True);ap.add_argument('--theme',default='cyan');ap.add_argument('--style',default='standard');ap.add_argument('--size',type=int,default=256);ap.add_argument('--animation',default='auto');ap.add_argument('--format',default='webp',choices=['webp','gif']);ap.add_argument('--out',required=True);a=ap.parse_args();
if a.app not in DEFAULT: ap.error(f'unknown app: {a.app}')
kind=DEFAULT[a.app] if a.animation=='auto' else a.animation
base=render_icon(a.app,a.theme,'dark',a.style,'default','none',a.size);masks=layer_masks(a.app,a.size);color=THEMES[a.theme][1]
coverp=ROOT/'symbols'/'animation-cover'/f'{a.app}.png'
if coverp.exists() and a.style=='standard':
 cm=alpha(coverp).resize((a.size,a.size),Image.Resampling.LANCZOS);base.alpha_composite(fill(cm,'#F7FBFF',255))
frames=[]
for i in range(30):
 t=i/30*2*math.pi;parts=[]
 for idx,m in enumerate(masks):
  ol=overlay(m,color,235)
  if kind=='glow-code':
   aa=int(115+120*(.5+.5*math.sin(t)));ol.putalpha(ol.getchannel('A').point(lambda p:int(p*aa/235)));ol=ol.filter(ImageFilter.GaussianBlur(max(1,a.size//110)))
  elif kind=='pulse-play':
   sc=1+.10*(.5+.5*math.sin(t));ol=transform_crop(ol,m,scale=sc)
  elif kind=='flow-cards':
   phase=t-idx*.9;aa=int(55+180*(.5+.5*math.sin(phase)));ol.putalpha(ol.getchannel('A').point(lambda p:int(p*aa/235)))
  elif kind=='draw-pencil':
   # diagonal-ish reveal by vertical cutoff over the real pencil coordinates
   cut=Image.new('L',(a.size,a.size),0);frac=.15+.85*(.5+.5*math.sin(t-math.pi/2));y=int(a.size*(1-frac));ImageDraw.Draw(cut).rectangle((0,y,a.size,a.size),fill=255);ol.putalpha(ImageChops.multiply(ol.getchannel('A'),cut))
  elif kind=='lock-vault': ol=transform_crop(ol,m,rotate=360*i/30)
  elif kind=='convert-swap':
   dx=(1 if idx==0 else -1)*int(a.size*.035*math.sin(t));ol=transform_crop(ol,m,dx=dx)
  elif kind=='pixel-spark':
   phase=t+(math.pi if idx else 0);aa=int(50+185*(.5+.5*math.sin(phase)));ol.putalpha(ol.getchannel('A').point(lambda p:int(p*aa/235)))
  elif kind=='resume-reveal':
   frac=.08+.92*(.5+.5*math.sin(t-math.pi/2));x=int(a.size*frac);cut=Image.new('L',(a.size,a.size),0);ImageDraw.Draw(cut).rectangle((0,0,x,a.size),fill=255);ol.putalpha(ImageChops.multiply(ol.getchannel('A'),cut))
  parts.append(ol)
 f=base.copy()
 for ol in parts:f.alpha_composite(ol)
 frames.append(f)
out=Path(a.out);out.parent.mkdir(parents=True,exist_ok=True)
if a.format=='webp':frames[0].save(out,'WEBP',save_all=True,append_images=frames[1:],duration=55,loop=0,quality=93,method=4)
else:frames[0].save(out,'GIF',save_all=True,append_images=frames[1:],duration=55,loop=0,disposal=2)
print(out)
