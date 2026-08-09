#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright
from urllib.parse import urlparse, unquote
import json, io, sys, mimetypes
from browser_utils import launch_chromium,classic_runtime
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from freev_registry import load_registry
APPS=[a['id'] for a in load_registry()['apps']]
report={'mask_visual':{},'animation_visual':{},'theme_inherit':False,'keyboard':False,'console_errors':[]}

runtime=classic_runtime(ROOT)

with sync_playwright() as p:
    browser=launch_chromium(p,headless=True)
    page=browser.new_page(viewport={'width':900,'height':500},device_scale_factor=1)
    page.on('console',lambda m: report['console_errors'].append(m.text) if m.type=='error' else None)

    def route_asset(route):
        path=unquote(urlparse(route.request.url).path).lstrip('/')
        fp=(ROOT/path).resolve()
        try:
            fp.relative_to(ROOT.resolve())
            if fp.is_file():
                body=fp.read_bytes();ct=mimetypes.guess_type(fp.name)[0] or 'application/octet-stream'
                route.fulfill(status=200,body=body,content_type=ct,headers={'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'})
                return
        except Exception:
            pass
        route.fulfill(status=404,body=b'not found',content_type='text/plain')

    page.route('https://freev.test/**',route_asset)
    page.set_content('<!doctype html><html lang="fr" data-freev-theme="cyan"><style>html,body{margin:0;background:#ff00ff}#stage{display:flex;gap:24px;align-items:center;padding:20px}</style><div id="stage"></div></html>')
    page.evaluate("globalThis.FREEV_ICON_ASSET_BASE='https://freev.test/'")
    page.add_script_tag(content=runtime)

    def make(app,**attrs):
        page.eval_on_selector('#stage','(el)=>el.innerHTML=""')
        page.evaluate("""({app,attrs})=>{const i=document.createElement('freev-icon');i.id='icon';i.setAttribute('app',app);for(const [k,v] of Object.entries(attrs))i.setAttribute(k,String(v));document.querySelector('#stage').append(i)}""",{'app':app,'attrs':attrs})
        page.wait_for_timeout(180)
        return page.locator('#icon')

    # Visual alpha-mask regression. A broken CSS mask becomes an almost full white square.
    for app in APPS:
        el=make(app,variant='monochrome-white',theme='cyan',size=128,motion='off')
        png=el.screenshot();im=Image.open(io.BytesIO(png)).convert('RGB');arr=np.asarray(im);n=arr.shape[0]*arr.shape[1]
        white=float(np.all(arr>225,axis=2).sum()/n)
        mag=float(((arr[:,:,0]>220)&(arr[:,:,2]>220)&(arr[:,:,1]<60)).sum()/n)
        ok=.005<white<.48 and mag>.42
        report['mask_visual'][app]={'white_ratio':round(white,4),'background_ratio':round(mag,4),'ok':ok}

    # Animations must change a local subset, not the entire icon.
    for app in APPS:
        el=make(app,variant='standard',theme='cyan',size=160,animation='auto')
        a=Image.open(io.BytesIO(el.screenshot())).convert('RGB');page.wait_for_timeout(420);b=Image.open(io.BytesIO(el.screenshot())).convert('RGB')
        A=np.asarray(a).astype('int16');B=np.asarray(b).astype('int16');diff=np.max(np.abs(A-B),axis=2)>8;ratio=float(diff.mean())
        ok=ratio>.0002 and ratio<.30
        report['animation_visual'][app]={'changed_ratio':round(ratio,4),'ok':ok}

    # Theme inheritance really changes the raster rendering.
    el=make('CodeMaster_V2',variant='standard',theme='inherit',size=128,motion='off')
    page.evaluate("document.documentElement.dataset.freevTheme='cyan'");page.wait_for_timeout(180);a=Image.open(io.BytesIO(el.screenshot())).convert('RGB')
    page.evaluate("document.documentElement.dataset.freevTheme='purple'");page.wait_for_timeout(220);b=Image.open(io.BytesIO(el.screenshot())).convert('RGB')
    report['theme_inherit']=ImageChops.difference(a,b).getbbox() is not None

    # Keyboard activation.
    el=make('CodeMaster_V2',variant='standard',theme='cyan',size=96,interactive='')
    page.evaluate("window.__act=0;document.querySelector('#icon').addEventListener('freev-activate',()=>window.__act++)")
    el.focus();page.keyboard.press('Enter');page.wait_for_timeout(50);report['keyboard']=page.evaluate('window.__act')==1
    browser.close()

report['ok']=all(x['ok'] for x in report['mask_visual'].values()) and all(x['ok'] for x in report['animation_visual'].values()) and report['theme_inherit'] and report['keyboard'] and not report['console_errors']
(ROOT/'tests'/'browser-visual-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
sys.exit(0 if report['ok'] else 1)
