from pathlib import Path
from PIL import Image,ImageEnhance,ImageOps,ImageDraw
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
THEMES={'cyan': ('#062B8C', '#11D7FF'), 'purple': ('#2C0D91', '#C84DFF'), 'emerald': ('#045C4A', '#23E1A7'), 'gold': ('#7A5400', '#FFD23B'), 'ruby': ('#7C0F1B', '#FF4B5C'), 'rose': ('#86115D', '#FF4FCB'), 'orange': ('#92300A', '#FF8A2A'), 'graphite': ('#172131', '#6E86A4'), 'ice': ('#54789B', '#D9F3FF')}
BADGES={'new': ('N', '#13C97B'), 'update': ('MAJ', '#2F7BFF'), 'beta': ('β', '#9A53FF'), 'pro': ('PRO', '#E0A800'), 'notification': ('', '#FF4B5C'), 'download': ('↓', '#17B9C8')}
FONT_BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def _hex(h):h=h.lstrip('#');return np.array([int(h[i:i+2],16) for i in (0,2,4)],dtype=np.float32)/255
def load_mask(app,small=False,anim=False):
 folder='animation' if anim else 'small-mask' if small else 'mask';im=Image.open(ROOT/'symbols'/folder/f'{app}.png').convert('RGBA');return im.getchannel('A')
def recolor(im,dark_hex,light_hex):
 a=np.array(im.convert('RGBA')).astype(np.float32)/255;c=a[...,:3];al=a[...,3:4];mx=c.max(2);mn=c.min(2);sat=np.where(mx>1e-6,(mx-mn)/(mx+1e-6),0);lum=.2126*c[...,0]+.7152*c[...,1]+.0722*c[...,2];pres=(sat<.14)&(lum>.68);neu=(sat<.08)&(lum<=.68);d=_hex(dark_hex);l=_hex(light_hex);t=np.clip((lum-.05)/.95,0,1)**.90;mp=d[None,None,:]*(1-t[...,None])+l*t[...,None];o=c.copy();m=(~pres)&(~neu)&(al[...,0]>.01);o[m]=mp[m];ti=d*.88+l*.12;mn2=neu&(al[...,0]>.01);o[mn2]=o[mn2]*.82+ti[None,:]*.18;return Image.fromarray((np.dstack([np.clip(o,0,1),al])*255).astype(np.uint8),'RGBA')
def fill(mask,color,opacity=255):lay=Image.new('RGBA',mask.size,color);a=mask.copy();a=a.point(lambda p:int(p*opacity/255)) if opacity!=255 else a;lay.putalpha(a);return lay
def grad(size,dark,light):d=np.array(Image.new('RGB',(1,1),dark))[0,0].astype(float);l=np.array(Image.new('RGB',(1,1),light))[0,0].astype(float);y,x=np.mgrid[0:size,0:size];t=(.38*x+.62*y)/(size-1);arr=(d*(1-t[...,None])+l*t[...,None]).astype(np.uint8);return Image.fromarray(arr,'RGB').convert('RGBA')
def symbol(app,size,color,small=False,max_ratio=.58):
 m=load_mask(app,small=small);bb=m.getbbox();m=m.crop(bb) if bb else m;m.thumbnail((int(size*max_ratio),int(size*max_ratio)),Image.Resampling.LANCZOS);o=Image.new('RGBA',(size,size),(0,0,0,0));o.alpha_composite(fill(m,color),((size-m.width)//2,(size-m.height)//2));return o
def badge(size,name):
 if name=='none':return Image.new('RGBA',(size,size),(0,0,0,0))
 txt,col=BADGES[name];o=Image.new('RGBA',(size,size),(0,0,0,0));dr=ImageDraw.Draw(o);bw=int(size*.25);bh=int(size*.17);x=size-bw-int(size*.02);y=int(size*.02);dr.rounded_rectangle((x,y,x+bw,y+bh),radius=bh//2,fill=col,outline='white',width=max(1,int(size*.012)))
 if name=='notification':rr=max(2,int(bh*.16));cx=x+bw//2;cy=y+bh//2;dr.ellipse((cx-rr,cy-rr,cx+rr,cy+rr),fill='white')
 else:
  try:from PIL import ImageFont;font=ImageFont.truetype(FONT_BOLD,max(7,int(bh*.34)))
  except:from PIL import ImageFont;font=ImageFont.load_default()
  bb=dr.textbbox((0,0),txt,font=font);dr.text((x+(bw-(bb[2]-bb[0]))/2,y+(bh-(bb[3]-bb[1]))/2-1),txt,font=font,fill='white')
 return o
def render_icon(app,theme='cyan',mode='dark',style='standard',state='default',badge_name='none',size=512):
 dark,light=THEMES[theme]
 if style in ('transparent','monochrome-white','monochrome-black','monochrome-brand'):
  color=light if style in ('transparent','monochrome-brand') else ('white' if style=='monochrome-white' else 'black');im=symbol(app,size,color,small=size<=32,max_ratio=.70 if size<=32 else .66)
 elif style=='small-simplified':
  im=grad(size,dark,light);m=Image.new('L',(size,size),0);ImageDraw.Draw(m).rounded_rectangle((0,0,size-1,size-1),radius=int(size*.24),fill=255);im.putalpha(m);im.alpha_composite(symbol(app,size,'white',small=True,max_ratio=.62))
 elif style=='glass':
  im=Image.new('RGBA',(size,size),(0,0,0,0));dr=ImageDraw.Draw(im);dr.rounded_rectangle((2,2,size-3,size-3),radius=int(size*.22),fill=tuple((np.array(_hex(dark))*255).astype(int))+(96,),outline=(255,255,255,82),width=max(1,size//128));dr.rounded_rectangle((int(size*.15),int(size*.19),int(size*.79),int(size*.81)),radius=int(size*.15),fill=(255,255,255,72),outline=(255,255,255,118),width=max(1,size//96));im.alpha_composite(symbol(app,size,'white',max_ratio=.58))
 else:
  im=Image.open(ROOT/'masters/clean'/f'{app}.png').convert('RGBA').resize((size,size),Image.Resampling.LANCZOS);im=recolor(im,dark,light);im=ImageEnhance.Brightness(im).enhance(1.08) if mode=='light' else ImageEnhance.Contrast(im).enhance(1.035)
 if state=='hover':im=ImageEnhance.Brightness(im).enhance(1.10)
 elif state=='active':im=ImageEnhance.Contrast(ImageEnhance.Brightness(im).enhance(1.08)).enhance(1.05)
 elif state=='disabled':al=im.getchannel('A');im=ImageOps.grayscale(im).convert('RGBA');im.putalpha(al.point(lambda p:int(p*.42)))
 im.alpha_composite(badge(size,badge_name));return im
