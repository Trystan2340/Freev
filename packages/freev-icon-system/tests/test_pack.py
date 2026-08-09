from pathlib import Path
from PIL import Image
import json,hashlib,zipfile,sys,subprocess,struct,zlib
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from freev_registry import load_registry,script_safe_json,validate_label
from icon_pipeline import open_bounded_image
APPS=[a['id'] for a in load_registry()['apps']]
errors=[]
# Security guards: active HTML labels are rejected and oversized headers are
# refused before Pillow allocates the decoded image.
try: validate_label('</script><img src=x onerror=alert(1)>')
except ValueError: pass
else: errors.append('unsafe registry label accepted')
safe_json=script_safe_json({'label':'</script><img src=x>'},ensure_ascii=False)
if '</script>' in safe_json or '\\u003c/script\\u003e' not in safe_json: errors.append('script JSON escaping failed')
def png_chunk(kind,data): return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
oversized=ROOT/'tests/_oversized-header.png'
oversized.write_bytes(b'\x89PNG\r\n\x1a\n'+png_chunk(b'IHDR',struct.pack('>IIBBBBB',5000,5000,8,6,0,0,0))+png_chunk(b'IEND',b''))
try:
 try: open_bounded_image(oversized,'test image')
 except RuntimeError as exc:
  if 'dimensions' not in str(exc): errors.append('oversized image failed for the wrong reason')
 else: errors.append('oversized image header accepted')
finally: oversized.unlink(missing_ok=True)
# masks must be RGBA with meaningful alpha and transparent corners
for app in APPS:
 p=ROOT/'symbols/mask'/f'{app}.png';im=Image.open(p)
 if im.mode!='RGBA':errors.append(f'{app} mask mode {im.mode}, expected RGBA')
 a=im.getchannel('A');ext=a.getextrema();
 if ext!=(0,255):errors.append(f'{app} alpha extrema {ext}')
 if a.getbbox() is None:errors.append(f'{app} empty mask')
# small dimensions
for theme in ['cyan','purple','emerald','gold','ruby','rose','orange','graphite','ice']:
 for s in [16,24,32]:
  for app in APPS:
   p=ROOT/'small'/theme/str(s)/f'{app}.png';
   if not p.exists() or Image.open(p).size!=(s,s):errors.append(f'bad small {p}')
# Android structure
for app in APPS:
 base=ROOT/'platform/android'/app/'res'
 req=['values/colors.xml','drawable-nodpi/ic_launcher_foreground.png','drawable-nodpi/ic_launcher_monochrome.png','mipmap-anydpi-v26/ic_launcher.xml','mipmap-anydpi-v33/ic_launcher.xml']
 for rel in req:
  if not (base/rel).exists():errors.append(f'android missing {app}/{rel}')
# Apple modern catalog
for app in APPS:
 p=ROOT/'platform/ios-modern'/app/'AppIcon.appiconset/Contents.json'
 if not p.exists():errors.append(f'iOS modern missing {app}')
 else:
  data=json.loads(p.read_text());vals=[x.get('appearances',[{}])[0].get('value','any') if x.get('appearances') else 'any' for x in data['images']]
  if set(vals)!={'any','dark','tinted'}:errors.append(f'iOS appearance set bad {app}: {vals}')
# JS syntax
r=subprocess.run(['node','--check',str(ROOT/'web/freev-icon.js')],capture_output=True,text=True)
if r.returncode:errors.append('JS syntax: '+r.stderr)
if errors: print('\n'.join(errors));sys.exit(1)
# V2.4 checks
for app in APPS:
 layers=list((ROOT/'symbols'/'animation-layers'/app).glob('layer-*.png'))
 if not layers: errors.append(f'animation layers missing {app}')
for app in APPS:
 p=ROOT/'platform/pwa'/app/'manifest.webmanifest'
 if not p.exists(): errors.append(f'PWA full manifest missing {app}')
 else:
  try: data=json.loads(p.read_text()); assert data.get('icons') and data.get('start_url')
  except Exception as e: errors.append(f'PWA manifest bad {app}: {e}')
if (ROOT/'web/index.html').read_text().find('V2.7 Final')<0: errors.append('demo version not V2.6')
js=(ROOT/'web/freev-icon.js').read_text()
for token in ['imageCache.delete(url)','key=`${master}|${theme}|${mode}|${c.width}x${c.height}`','animation-layers','clearFreevIconCaches']:
 if token not in js: errors.append('runtime fix missing: '+token)


# V2.7 hardening checks
for token in ["const ANIMATIONS=new Set", "function effectiveAnimation", "const BADGES=new Set", "function finiteConfig", "function maxRenderSide", "const HTMLElementBase=globalThis.HTMLElement||class {}", "Invalid FREEV asset base", "from './generated-apps.js'", "RECONSTRUCT_SYMBOL.has(app)"]:
 if token not in js: errors.append('V2.6 hardening missing: '+token)

# Apple authoring checks
for app in APPS:
 src=ROOT/'platform/ios-modern'/app/'IconComposer-Source'
 for name in ['Default.png','Dark.png','Clear-Light.png','Clear-Dark.png','Tinted-Light.png','Tinted-Dark.png']:
  if not (src/name).exists(): errors.append(f'Apple six-appearance source missing {app}/{name}')
for rel in ['types/freev-react.d.ts','types/freev-vue.d.ts','web/frameworks/FreevIconVue.js']:
 if not (ROOT/rel).exists(): errors.append('V2.4 missing '+rel)
# Build output wrappers must import sibling runtime, never parent runtime.
r=subprocess.run(['node',str(ROOT/'build.mjs')],cwd=ROOT,capture_output=True,text=True)
if r.returncode: errors.append('build failed: '+r.stderr)
else:
 for rel in ['dist/FreevIconReact.js','dist/FreevIconVue.js']:
  txt=(ROOT/rel).read_text()
  if '../freev-icon.js' in txt or './freev-icon.js' not in txt: errors.append('bad dist runtime import '+rel)
# Static exporter must reject loading state.
r=subprocess.run([sys.executable,str(ROOT/'tools/export_icon.py'),'--app','CodeMaster_V2','--state','loading','--out',str(ROOT/'tests/_should_not_exist.png')],cwd=ROOT,capture_output=True,text=True)
if r.returncode==0: errors.append('static exporter incorrectly accepts loading')
if (ROOT/'tests/_should_not_exist.png').exists(): (ROOT/'tests/_should_not_exist.png').unlink()


for rel in ['registry/apps.json','tools/icon_pipeline.py','tools/generate_registry.py','tools/freev_registry.py','incoming/README.md','web/generated-apps.js']:
 if not (ROOT/rel).exists(): errors.append('V2.7 auto-onboarding missing '+rel)
r=subprocess.run([sys.executable,str(ROOT/'tools/icon_pipeline.py'),'check'],cwd=ROOT,capture_output=True,text=True)
if r.returncode: errors.append('mandatory icon pipeline check failed: '+r.stderr+r.stdout)

if errors: print('\n'.join(errors));sys.exit(1)
print('FREEV V2.7 tests OK')
