#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright
from urllib.parse import urlparse, unquote
from PIL import Image, ImageChops
import io, json, mimetypes, sys
from browser_utils import launch_chromium,classic_runtime
ROOT=Path(__file__).resolve().parents[1]
report={'invalid_size':False,'disabled_click':False,'motion_off_static':{},'reduced_motion_static':{},'console_errors':[]}
runtime=classic_runtime(ROOT)
sys.path.insert(0,str(ROOT/'tools'))
from freev_registry import load_registry
APPS=[a['id'] for a in load_registry()['apps']]
with sync_playwright() as p:
 browser=launch_chromium(p,headless=True)
 page=browser.new_page(viewport={'width':900,'height':500},device_scale_factor=1)
 page.on('console',lambda m: report['console_errors'].append(m.text) if m.type=='error' else None)
 def route_asset(route):
  path=unquote(urlparse(route.request.url).path).lstrip('/');fp=(ROOT/path).resolve()
  try:
   fp.relative_to(ROOT.resolve())
   if fp.is_file():
    route.fulfill(status=200,body=fp.read_bytes(),content_type=mimetypes.guess_type(fp.name)[0] or 'application/octet-stream',headers={'Access-Control-Allow-Origin':'*'});return
  except Exception: pass
  route.fulfill(status=404,body=b'not found')
 page.route('https://freev.test/**',route_asset)
 page.set_content('<!doctype html><html data-freev-theme="cyan"><style>html,body{margin:0;background:#f0f}#stage{padding:20px}</style><div id="stage"></div></html>')
 page.evaluate("globalThis.FREEV_ICON_ASSET_BASE='https://freev.test/'")
 page.add_script_tag(content=runtime)
 def make(app='CodeMaster_V2',**attrs):
  page.eval_on_selector('#stage','el=>el.innerHTML=""')
  page.evaluate("""({app,attrs})=>{const i=document.createElement('freev-icon');i.id='icon';i.setAttribute('app',app);for(const[k,v]of Object.entries(attrs))i.setAttribute(k,String(v));document.querySelector('#stage').append(i)}""",{'app':app,'attrs':attrs})
  page.wait_for_timeout(160);return page.locator('#icon')
 # Invalid sizes must resolve to 128px, not NaN or huge geometry.
 el=make(size='abc',motion='off');box=el.bounding_box();report['invalid_size']=bool(box and abs(box['width']-128)<.5 and abs(box['height']-128)<.5)
 # Disabled interactive icons must not activate by pointer.
 el=make(size=96,interactive='',state='disabled',motion='off')
 page.evaluate("window.__clicks=0;window.__acts=0;const i=document.querySelector('#icon');i.addEventListener('click',()=>window.__clicks++);i.addEventListener('freev-activate',()=>window.__acts++)")
 el.click(force=True);page.wait_for_timeout(30);report['disabled_click']=page.evaluate('window.__clicks===0&&window.__acts===0')
 # motion=off must render exactly the same pixels as animation=none.
 for app in APPS:
  a=Image.open(io.BytesIO(make(app,size=144,animation='none',motion='off').screenshot())).convert('RGBA')
  b=Image.open(io.BytesIO(make(app,size=144,animation='auto',motion='off').screenshot())).convert('RGBA')
  report['motion_off_static'][app]=ImageChops.difference(a,b).getbbox() is None
 # OS reduced-motion must have the same exact static rendering when motion=auto.
 page.emulate_media(reduced_motion='reduce')
 for app in APPS:
  a=Image.open(io.BytesIO(make(app,size=144,animation='none',motion='auto').screenshot())).convert('RGBA')
  b=Image.open(io.BytesIO(make(app,size=144,animation='auto',motion='auto').screenshot())).convert('RGBA')
  report['reduced_motion_static'][app]=ImageChops.difference(a,b).getbbox() is None
 browser.close()
report['ok']=report['invalid_size'] and report['disabled_click'] and all(report['motion_off_static'].values()) and all(report['reduced_motion_static'].values()) and not report['console_errors']
(ROOT/'tests/V2_4_EDGE_REPORT.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2));sys.exit(0 if report['ok'] else 1)
