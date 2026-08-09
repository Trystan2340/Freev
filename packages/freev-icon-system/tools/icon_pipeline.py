#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
from PIL import Image,ImageFilter,ImageDraw,ImageOps,ImageEnhance
import argparse,sys,json,re,shutil,time,hashlib,subprocess,unicodedata
import numpy as np
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'))
from freev_registry import load_registry,REGISTRY_PATH,SUPPORTED_ANIMATIONS,ID_RE,validate_label
from freev_render import THEMES,render_icon,grad,fill

THEME_NAMES=list(THEMES)
INCOMING=ROOT/'incoming'
IMAGE_EXT={'.png','.jpg','.jpeg','.webp'}
WEB_SIZES=[16,32,48,64,128,180,192,512]
IOS_SIZES=[40,60,58,87,80,120,180,76,152,167,1024]
MAC_SIZES=[16,32,64,128,256,512,1024]
ANDROID={'mdpi':48,'hdpi':72,'xhdpi':96,'xxhdpi':144,'xxxhdpi':192}
MAX_SOURCE_BYTES=25*1024*1024
MAX_SOURCE_SIDE=4096
MAX_SOURCE_PIXELS=MAX_SOURCE_SIDE*MAX_SOURCE_SIDE

def open_bounded_image(path,label='image'):
 path=Path(path)
 if path.stat().st_size>MAX_SOURCE_BYTES:raise RuntimeError(f'{label} exceeds the 25 MiB limit')
 image=Image.open(path)
 width,height=image.size
 if width<1 or height<1 or width>MAX_SOURCE_SIDE or height>MAX_SOURCE_SIDE or width*height>MAX_SOURCE_PIXELS:
  image.close();raise RuntimeError(f'{label} dimensions exceed the {MAX_SOURCE_SIDE}x{MAX_SOURCE_SIDE} limit')
 image.load()
 return image

def sha256(path):
 h=hashlib.sha256()
 with open(path,'rb') as f:
  for c in iter(lambda:f.read(1<<20),b''):h.update(c)
 return h.hexdigest()

def safe_id(stem):
 s=unicodedata.normalize('NFKD',stem).encode('ascii','ignore').decode();s=re.sub(r'[^A-Za-z0-9]+','_',s).strip('_')
 if not s or not s[0].isalpha():s='Freev_'+s
 return s[:64]

def human_label(stem):return re.sub(r'[_-]+',' ',stem).strip()

def rgba_mask(alpha):
 z=Image.new('RGBA',alpha.size,(255,255,255,0));z.putalpha(alpha);return z

def clean_border_matte(im):
 im=im.convert('RGBA');a=np.array(im);rgb=a[...,:3]
 near=(rgb.max(2)<38)&(a[...,3]>0);h,w=near.shape
 seen=np.zeros_like(near,bool);stack=[]
 for x in range(w):
  if near[0,x]:stack.append((0,x));seen[0,x]=1
  if near[h-1,x] and not seen[h-1,x]:stack.append((h-1,x));seen[h-1,x]=1
 for y in range(h):
  if near[y,0] and not seen[y,0]:stack.append((y,0));seen[y,0]=1
  if near[y,w-1] and not seen[y,w-1]:stack.append((y,w-1));seen[y,w-1]=1
 i=0
 while i<len(stack):
  y,x=stack[i];i+=1
  for ny,nx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
   if 0<=ny<h and 0<=nx<w and near[ny,nx] and not seen[ny,nx]:seen[ny,nx]=1;stack.append((ny,nx))
 a[seen,3]=0
 return Image.fromarray(a,'RGBA')

def components(mask):
 h,w=mask.shape;seen=np.zeros_like(mask,bool);out=[];ys,xs=np.where(mask)
 for sy,sx in zip(ys,xs):
  if seen[sy,sx]:continue
  q=[(int(sy),int(sx))];seen[sy,sx]=1;pts=[];qi=0
  while qi<len(q):
   y,x=q[qi];qi+=1;pts.append((y,x))
   for ny in (y-1,y,y+1):
    for nx in (x-1,x,x+1):
     if 0<=ny<h and 0<=nx<w and not seen[ny,nx] and mask[ny,nx]:seen[ny,nx]=1;q.append((ny,nx))
  out.append(pts)
 return out

def auto_symbol_mask(im):
 arr=np.array(im.convert('RGB')).astype(np.float32)/255.;r,g,b=arr[...,0],arr[...,1],arr[...,2];mx=arr.max(2);mn=arr.min(2);c=mx-mn
 sat=np.where(mx>1e-6,c/(mx+1e-6),0);hue=np.zeros_like(mx);nz=c>1e-6
 idx=(mx==r)&nz;hue[idx]=((g[idx]-b[idx])/c[idx])%6
 idx=(mx==g)&nz;hue[idx]=((b[idx]-r[idx])/c[idx])+2
 idx=(mx==b)&nz;hue[idx]=((r[idx]-g[idx])/c[idx])+4;hue/=6
 yy,xx=np.mgrid[0:1024,0:1024];inner=(xx>=.24*1024)&(xx<=.76*1024)&(yy>=.28*1024)&(yy<=.80*1024)
 cand=inner&(hue>=.57)&(hue<=.67)&(sat>.48)&(mx>.10)&(mx<.92)
 keep=np.zeros_like(cand)
 for pts in components(cand):
  if len(pts)<24:continue
  ys=np.array([p[0] for p in pts]);xs=np.array([p[1] for p in pts]);bb=(xs.min(),ys.min(),xs.max(),ys.max());cx=xs.mean();cy=ys.mean()
  if bb[0]<=.245*1024 or bb[2]>=.755*1024 or bb[1]<=.285*1024 or bb[3]>=.795*1024:continue
  if not (.27*1024<=cx<=.73*1024 and .31*1024<=cy<=.77*1024):continue
  keep[ys,xs]=1
 alpha=Image.fromarray((keep*255).astype('uint8'),'L').filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(.65))
 bb=alpha.getbbox();area=np.count_nonzero(np.array(alpha)>96)/(1024*1024)
 if not bb:raise RuntimeError('automatic symbol extraction found no central FREEV glyph')
 bw=(bb[2]-bb[0])/1024;bh=(bb[3]-bb[1])/1024
 confidence=min(1.0,area/.025)*min(1.0,bw/.18)*min(1.0,bh/.15)
 if area<.006 or area>.14 or bw>.58 or bh>.58 or confidence<.48:
  raise RuntimeError(f'automatic symbol extraction confidence too low (area={area:.3f}, box={bw:.2f}x{bh:.2f}, confidence={confidence:.2f}); add a sibling .mask.png')
 return alpha,round(confidence,3)

def load_override_mask(path):
 raw=open_bounded_image(path,'override mask').resize((1024,1024),Image.Resampling.LANCZOS);im=raw.convert('RGBA');a=im.getchannel('A')
 if a.getextrema()==(255,255): a=ImageOps.grayscale(raw.convert('RGB'))
 if a.getbbox() is None: raise RuntimeError('override mask has empty alpha/luminance')
 return a

def save_rgb(im,path,fmt='PNG'):
 path.parent.mkdir(parents=True,exist_ok=True);im.convert('RGB').save(path,fmt)

def save_rgba(im,path):path.parent.mkdir(parents=True,exist_ok=True);im.convert('RGBA').save(path,'PNG')

def make_maskable(app,size=512):
 dark,light=THEMES['cyan'];bg=grad(size,dark,light);m=Image.open(ROOT/'symbols/mask'/f'{app}.png').convert('RGBA').getchannel('A');bb=m.getbbox();m=m.crop(bb);m.thumbnail((int(size*.56),int(size*.56)),Image.Resampling.LANCZOS);lay=fill(m,'white');bg.alpha_composite(lay,((size-m.width)//2,(size-m.height)//2));return bg

def write_platforms(app,label,short):
 clean=Image.open(ROOT/'masters/clean'/f'{app}.png').convert('RGBA')
 # Web
 wd=ROOT/'platform/web'/app;wd.mkdir(parents=True,exist_ok=True)
 for s in WEB_SIZES:clean.resize((s,s),Image.Resampling.LANCZOS).save(wd/f'icon-{s}.png')
 clean.resize((256,256),Image.Resampling.LANCZOS).save(wd/'favicon.ico','ICO',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
 # PWA
 pd=ROOT/'platform/pwa'/app;pd.mkdir(parents=True,exist_ok=True)
 for s in [192,512]:clean.resize((s,s),Image.Resampling.LANCZOS).convert('RGB').save(pd/f'icon-{s}.png')
 make_maskable(app).convert('RGB').save(pd/'maskable-512.png')
 manifest={'id':'./','name':label,'short_name':short[:12],'start_url':'./','scope':'./','display':'standalone','background_color':'#071226','theme_color':'#062B8C','icons':[{'src':'icon-192.png','sizes':'192x192','type':'image/png','purpose':'any'},{'src':'icon-512.png','sizes':'512x512','type':'image/png','purpose':'any'},{'src':'maskable-512.png','sizes':'512x512','type':'image/png','purpose':'maskable'}]}
 (pd/'manifest.webmanifest').write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding='utf-8');(pd/'manifest-snippet.json').write_text(json.dumps({'icons':manifest['icons']},indent=2),encoding='utf-8');(pd/'PWA_INTEGRATION.md').write_text(f'# {label}\nCopier les icônes et adapter id/start_url/scope au déploiement.\n',encoding='utf-8')
 # Android legacy + Studio res
 ad=ROOT/'platform/android'/app;ad.mkdir(parents=True,exist_ok=True)
 for dens,s in ANDROID.items():
  x=clean.resize((s,s),Image.Resampling.LANCZOS);(ad/f'mipmap-{dens}').mkdir(exist_ok=True);x.save(ad/f'mipmap-{dens}/ic_launcher.png')
  (ad/'res'/f'mipmap-{dens}').mkdir(parents=True,exist_ok=True);x.save(ad/'res'/f'mipmap-{dens}/ic_launcher.png')
 fg=Image.new('RGBA',(432,432),(0,0,0,0));m=Image.open(ROOT/'symbols/mask'/f'{app}.png').convert('RGBA').getchannel('A');bb=m.getbbox();m=m.crop(bb);m.thumbnail((240,240),Image.Resampling.LANCZOS);fg.alpha_composite(fill(m,'white'),((432-m.width)//2,(432-m.height)//2));fg.save(ad/'adaptive-foreground-432.png')
 save_rgba(fg,ad/'res/drawable-nodpi/ic_launcher_foreground.png');save_rgba(fg,ad/'res/drawable-nodpi/ic_launcher_monochrome.png')
 for api,mono in [('mipmap-anydpi-v26',False),('mipmap-anydpi-v33',True)]:
  d=ad/'res'/api;d.mkdir(parents=True,exist_ok=True)
  body='<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/freev_icon_background"/>\n    <foreground android:drawable="@drawable/ic_launcher_foreground"/>\n'+('    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>\n' if mono else '')+'</adaptive-icon>\n'
  (d/'ic_launcher.xml').write_text(body);(d/'ic_launcher_round.xml').write_text(body)
 vd=ad/'res/values';vd.mkdir(parents=True,exist_ok=True);(vd/'colors.xml').write_text('<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="freev_icon_background">#062B8C</color></resources>\n')
 (ad/'colors.xml').write_text((vd/'colors.xml').read_text());(ad/'ic_launcher.xml').write_text((ad/'res/mipmap-anydpi-v26/ic_launcher.xml').read_text());(ad/'ANDROID_STUDIO_READY.md').write_text('# Android Studio\nCopier le contenu de `res/` dans `app/src/main/res/`.\n')
 # iOS legacy
 ios=ROOT/'platform/ios'/app/'AppIcon.appiconset';ios.mkdir(parents=True,exist_ok=True)
 for s in IOS_SIZES:clean.resize((s,s),Image.Resampling.LANCZOS).convert('RGB').save(ios/f'icon-{s}.png')
 legacy=[('iphone','20x20','2x',40),('iphone','20x20','3x',60),('iphone','29x29','2x',58),('iphone','29x29','3x',87),('iphone','40x40','2x',80),('iphone','40x40','3x',120),('iphone','60x60','2x',120),('iphone','60x60','3x',180),('ipad','76x76','1x',76),('ipad','76x76','2x',152),('ipad','83.5x83.5','2x',167),('ios-marketing','1024x1024','1x',1024)]
 (ios/'Contents.json').write_text(json.dumps({'images':[{'idiom':i,'size':s,'scale':sc,'filename':f'icon-{n}.png'} for i,s,sc,n in legacy],'info':{'author':'FREEV','version':1}},indent=2),encoding='utf-8')
 # Apple modern
 md=ROOT/'platform/ios-modern'/app;aset=md/'AppIcon.appiconset';src=md/'IconComposer-Source';aset.mkdir(parents=True,exist_ok=True);src.mkdir(parents=True,exist_ok=True)
 anyi=clean.resize((1024,1024),Image.Resampling.LANCZOS).convert('RGB');dark=ImageEnhance.Brightness(anyi).enhance(.82);tint=ImageOps.grayscale(anyi).convert('RGB')
 anyi.save(aset/'AppIcon-Any.png');dark.save(aset/'AppIcon-Dark.png');tint.save(aset/'AppIcon-Tinted.png')
 contents={'images':[{'filename':'AppIcon-Any.png','idiom':'universal','platform':'ios','size':'1024x1024'},{'appearances':[{'appearance':'luminosity','value':'dark'}],'filename':'AppIcon-Dark.png','idiom':'universal','platform':'ios','size':'1024x1024'},{'appearances':[{'appearance':'luminosity','value':'tinted'}],'filename':'AppIcon-Tinted.png','idiom':'universal','platform':'ios','size':'1024x1024'}],'info':{'author':'xcode','version':1}}
 (aset/'Contents.json').write_text(json.dumps(contents,indent=2),encoding='utf-8')
 anyi.save(src/'Default.png');dark.save(src/'Dark.png');tint.save(src/'Mono-Tinted.png');tint.save(src/'Tinted-Light.png');ImageEnhance.Brightness(tint).enhance(.55).save(src/'Tinted-Dark.png')
 transparent=render_icon(app,'cyan','light','transparent','default','none',1024);transparent.save(src/'Clear-Light.png');ImageEnhance.Brightness(transparent).enhance(.68).save(src/'Clear-Dark.png');(src/'README.md').write_text('# Icon Composer sources\nSources raster préparées pour les apparences Apple.\n')
 # Windows/macOS
 win=ROOT/'platform/windows'/app;win.mkdir(parents=True,exist_ok=True);clean.resize((256,256),Image.Resampling.LANCZOS).save(win/f'{app}.ico','ICO',sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
 mac=ROOT/'platform/macos'/app;mac.mkdir(parents=True,exist_ok=True)
 for s in MAC_SIZES:clean.resize((s,s),Image.Resampling.LANCZOS).save(mac/f'icon_{s}x{s}.png')
 clean.resize((1024,1024),Image.Resampling.LANCZOS).save(mac/f'{app}.icns','ICNS')

def write_assets(app,label,source,mask_override=None):
 src=open_bounded_image(source,'source')
 if src.width!=src.height:raise RuntimeError(f'source must be square, got {src.width}x{src.height}')
 if src.width<512:raise RuntimeError('source must be at least 512x512')
 native=ROOT/'masters/original-native'/f'{app}.png';native.parent.mkdir(parents=True,exist_ok=True)
 shutil.copy2(source,native) if source.suffix.lower()=='.png' else src.convert('RGBA').save(native,'PNG')
 orig=src.convert('RGB').resize((1024,1024),Image.Resampling.LANCZOS);save_rgb(orig,ROOT/'masters/original-1024'/f'{app}.png')
 clean=clean_border_matte(orig);save_rgba(clean,ROOT/'masters/clean'/f'{app}.png')
 if mask_override:alpha=load_override_mask(mask_override);confidence=1.0
 else:alpha,confidence=auto_symbol_mask(orig)
 save_rgba(rgba_mask(alpha),ROOT/'symbols/mask'/f'{app}.png')
 # Small mask is slightly closed/strengthened while preserving the same glyph.
 small=alpha.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(.45));save_rgba(rgba_mask(small),ROOT/'symbols/small-mask'/f'{app}.png')
 for folder in ['animation','animation-cover'] : save_rgba(rgba_mask(alpha),ROOT/'symbols'/folder/f'{app}.png')
 ld=ROOT/'symbols/animation-layers'/app;ld.mkdir(parents=True,exist_ok=True);save_rgba(rgba_mask(alpha),ld/'layer-1.png')
 for suffix,color in [('white','white'),('black','black'),('brand-cyan','#11D7FF')]:save_rgba(fill(alpha,color),ROOT/'symbols/theme'/f'{app}_{suffix}.png')
 # Required small exports across every theme.
 for theme in THEME_NAMES:
  for s in [16,24,32]:
   p=ROOT/'small'/theme/str(s)/f'{app}.png';p.parent.mkdir(parents=True,exist_ok=True);render_icon(app,theme,'dark','small-simplified','default','none',s).save(p)
 # Per-app previews
 prev=ROOT/'previews'/app;prev.mkdir(parents=True,exist_ok=True)
 render_icon(app,'cyan','dark','glass','default','none',512).save(prev/'glass-cyan.png');render_icon(app,'cyan','dark','monochrome-black','default','none',512).save(prev/'monochrome-black.png');render_icon(app,'cyan','dark','small-simplified','default','none',128).save(prev/'small-simplified-preview.png');render_icon(app,'cyan','dark','monochrome-white','default','none',512).save(prev/'transparent-symbol-white.png')
 return confidence

def cleanup_app(app):
 for base in ['masters/original-native','masters/original-1024','masters/clean','symbols/mask','symbols/small-mask','symbols/animation','symbols/animation-cover']:
  p=ROOT/base/f'{app}.png';p.unlink(missing_ok=True)
 for base in ['symbols/animation-layers','previews','platform/web','platform/pwa','platform/android','platform/ios','platform/ios-modern','platform/windows','platform/macos']:
  shutil.rmtree(ROOT/base/app,ignore_errors=True)
 for theme in THEME_NAMES:
  for s in [16,24,32]:(ROOT/'small'/theme/str(s)/f'{app}.png').unlink(missing_ok=True)
 for suffix in ['white','black','brand-cyan']:(ROOT/'symbols/theme'/f'{app}_{suffix}.png').unlink(missing_ok=True)
 (ROOT/'animations/v2_3_internal'/f'{app}.webp').unlink(missing_ok=True)

def read_meta(img):
 p=img.with_suffix('.json');m=json.loads(p.read_text(encoding='utf-8')) if p.exists() else {}
 aid=m.get('id') or safe_id(img.stem);label=validate_label(m.get('label') or human_label(img.stem));kind=m.get('kind','software');anim=m.get('animation','pulse-play');short=validate_label(m.get('shortName') or label,'shortName',40)
 if not ID_RE.fullmatch(aid):raise RuntimeError(f'invalid id {aid!r}')
 if kind not in {'software','game'}:raise RuntimeError('kind must be software or game')
 if anim not in SUPPORTED_ANIMATIONS:raise RuntimeError(f'unsupported animation {anim}')
 return p,m,{'id':aid,'label':label,'kind':kind,'shortName':short[:12],'animation':anim,'animationLayers':1,'animationCover':True,'reconstructAnimationSymbol':True}

def register(entry):
 reg=load_registry();reg['apps'].append(entry);REGISTRY_PATH.write_text(json.dumps(reg,indent=2,ensure_ascii=False),encoding='utf-8')
 subprocess.run([sys.executable,str(ROOT/'tools/generate_registry.py')],cwd=ROOT,check=True)

def process_one(img):
 meta_path,meta,entry=read_meta(img);app=entry['id'];reg=load_registry()
 if any(a['id']==app for a in reg['apps']):raise RuntimeError(f'{app} is already registered')
 mask=img.with_name(img.stem+'.mask.png');mask=mask if mask.exists() else None
 try:
  confidence=write_assets(app,entry['label'],img,mask);entry['sourceSha256']=sha256(ROOT/'masters/original-native'/f'{app}.png');entry['symbolExtractionConfidence']=confidence;write_platforms(app,entry['label'],entry['shortName'])
  # Registry must exist before animation exporter can resolve the default animation.
  register(entry)
  out=ROOT/'animations/v2_3_internal'/f'{app}.webp';out.parent.mkdir(parents=True,exist_ok=True);subprocess.run([sys.executable,str(ROOT/'tools/export_animation.py'),'--app',app,'--animation',entry['animation'],'--out',str(out)],cwd=ROOT,check=True)
  errors=check_app(app,entry)
  if errors:raise RuntimeError('; '.join(errors))
  # Successful inbox items are consumed; the canonical master is preserved.
  img.unlink(missing_ok=True);meta_path.unlink(missing_ok=True)
  if mask:mask.unlink(missing_ok=True)
  print(f'✓ FREEV auto-added {app} ({entry["kind"]}) — confidence {confidence}')
 except Exception:
  # If registry was already appended, remove it as part of rollback.
  r=load_registry()
  if any(a['id']==app for a in r['apps']):r['apps']=[a for a in r['apps'] if a['id']!=app];REGISTRY_PATH.write_text(json.dumps(r,indent=2,ensure_ascii=False),encoding='utf-8');subprocess.run([sys.executable,str(ROOT/'tools/generate_registry.py')],cwd=ROOT)
  cleanup_app(app);raise

def required_paths(app):
 paths=[ROOT/'masters/original-native'/f'{app}.png',ROOT/'masters/original-1024'/f'{app}.png',ROOT/'masters/clean'/f'{app}.png',ROOT/'symbols/mask'/f'{app}.png',ROOT/'symbols/small-mask'/f'{app}.png',ROOT/'symbols/animation-layers'/app/'layer-1.png',ROOT/'animations/v2_3_internal'/f'{app}.webp',ROOT/'platform/web'/app/'favicon.ico',ROOT/'platform/pwa'/app/'manifest.webmanifest',ROOT/'platform/pwa'/app/'maskable-512.png',ROOT/'platform/android'/app/'res/mipmap-anydpi-v33/ic_launcher.xml',ROOT/'platform/ios'/app/'AppIcon.appiconset/Contents.json',ROOT/'platform/ios-modern'/app/'AppIcon.appiconset/Contents.json',ROOT/'platform/windows'/app/f'{app}.ico',ROOT/'platform/macos'/app/f'{app}.icns']
 for t in THEME_NAMES:
  for s in [16,24,32]:paths.append(ROOT/'small'/t/str(s)/f'{app}.png')
 return paths

def check_app(app,entry=None):
 errs=[]
 entry=entry or next((a for a in load_registry()['apps'] if a['id']==app),{})
 for p in required_paths(app):
  if not p.exists():errs.append(f'missing {p.relative_to(ROOT)}')
 layers=sorted((ROOT/'symbols/animation-layers'/app).glob('layer-*.png'))
 if len(layers)!=entry.get('animationLayers',1): errs.append(f'wrong animation layer count for {app}: {len(layers)}')
 if entry.get('animationCover') and not (ROOT/'symbols/animation-cover'/f'{app}.png').exists(): errs.append(f'missing animation cover for {app}')
 for suffix in ['white','black','brand-cyan']:
  if not (ROOT/'symbols/theme'/f'{app}_{suffix}.png').exists(): errs.append(f'missing theme symbol {app}_{suffix}')
 try:
  m=Image.open(ROOT/'symbols/mask'/f'{app}.png').convert('RGBA').getchannel('A')
  if not m.getbbox():errs.append(f'empty symbol mask {app}')
 except Exception as e:errs.append(f'invalid symbol mask {app}: {e}')
 return errs

def pending_images():return sorted(p for p in INCOMING.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXT and not p.name.endswith('.mask.png') and not p.name.startswith('_'))

def check_all(enforce_pending=True):
 reg=load_registry();errs=[];ids={a['id'] for a in reg['apps']}
 for a in reg['apps']:errs.extend(check_app(a['id'],a))
 # Prevent bypassing the mandatory registry pipeline by copying a master manually.
 for p in (ROOT/'masters/original-native').glob('*.png'):
  if p.stem not in ids:errs.append(f'unregistered master detected: {p.name}; use incoming/ or icon_pipeline.py add')
 if enforce_pending and pending_images():errs.append('pending icons remain in incoming/: '+', '.join(p.name for p in pending_images()))
 return errs

def sync(enforce=True):
 INCOMING.mkdir(exist_ok=True)
 for img in pending_images():process_one(img)
 subprocess.run([sys.executable,str(ROOT/'tools/generate_registry.py')],cwd=ROOT,check=True)
 errs=check_all(enforce_pending=enforce)
 if errs:raise RuntimeError('FREEV mandatory icon pipeline failed:\n- '+'\n- '.join(errs))
 print(f'✓ FREEV registry complete: {len(load_registry()["apps"])} apps; mandatory outputs present')


def clean_transient():
 for d in ROOT.rglob('__pycache__'): shutil.rmtree(d,ignore_errors=True)
 for f in ROOT.rglob('*.pyc'):
  try:f.unlink()
  except FileNotFoundError:pass

def main():
 ap=argparse.ArgumentParser(description='FREEV mandatory automatic icon onboarding system');sub=ap.add_subparsers(dest='cmd',required=True)
 s=sub.add_parser('sync');s.add_argument('--enforce',action='store_true',help='fail if anything remains incomplete')
 c=sub.add_parser('check')
 a=sub.add_parser('add');a.add_argument('source');a.add_argument('--id');a.add_argument('--label');a.add_argument('--kind',choices=['software','game'],default='software');a.add_argument('--animation',choices=sorted(SUPPORTED_ANIMATIONS),default='pulse-play');a.add_argument('--short-name')
 w=sub.add_parser('watch');w.add_argument('--interval',type=float,default=1.5)
 args=ap.parse_args()
 if args.cmd=='sync':sync(args.enforce)
 elif args.cmd=='check':
  subprocess.run([sys.executable,str(ROOT/'tools/generate_registry.py')],cwd=ROOT,check=True);errs=check_all(True)
  if errs:raise SystemExit('FREEV mandatory icon check failed:\n- '+'\n- '.join(errs))
  print('✓ FREEV mandatory icon check PASS')
 elif args.cmd=='add':
  src=Path(args.source).resolve()
  if not src.exists():raise SystemExit(f'not found: {src}')
  dst=INCOMING/src.name;shutil.copy2(src,dst);meta={'id':args.id or safe_id(src.stem),'label':args.label or human_label(src.stem),'kind':args.kind,'animation':args.animation,'shortName':args.short_name or args.label or human_label(src.stem)};dst.with_suffix('.json').write_text(json.dumps(meta,indent=2,ensure_ascii=False),encoding='utf-8');sync(True)
 elif args.cmd=='watch':
  print(f'FREEV watcher active on {INCOMING} — Ctrl+C to stop')
  seen=None
  try:
   while True:
    cur=tuple((p.name,p.stat().st_mtime_ns,p.stat().st_size) for p in pending_images())
    if cur and cur!=seen:
     time.sleep(.5)
     try:sync(True)
     except Exception as e:print(f'✗ {e}',file=sys.stderr)
    seen=cur;time.sleep(max(.5,args.interval))
  except KeyboardInterrupt:pass
if __name__=='__main__':
 try: main()
 finally: clean_transient()
