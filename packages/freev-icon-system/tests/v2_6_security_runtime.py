#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright
from urllib.parse import urlparse, unquote
from browser_utils import launch_chromium,classic_runtime
import json, mimetypes, sys

ROOT=Path(__file__).resolve().parents[1]
report={
  'animation_injection_blocked':False,
  'invalid_animation_static':False,
  'invalid_badge_hidden':False,
  'invalid_globals_safe':False,
  'invalid_asset_base_error_and_fallback':False,
  'invalid_app_error_all_variants':False,
  'small_badge_inside_bounds':False,
  'ssr_safe':False,
  'console_errors':[]
}
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
                route.fulfill(status=200,body=fp.read_bytes(),content_type=mimetypes.guess_type(fp.name)[0] or 'application/octet-stream',headers={'Access-Control-Allow-Origin':'*'})
                return
        except Exception: pass
        route.fulfill(status=404,body=b'not found')
    page.route('https://freev.test/**',route_asset)
    page.set_content('<!doctype html><html data-freev-theme="cyan"><style>html,body{margin:0;background:#f0f}#stage{padding:20px}</style><div id="stage"></div></html>')
    page.evaluate("globalThis.FREEV_ICON_ASSET_BASE='https://freev.test/'")
    page.add_script_tag(content=runtime)
    def make(**attrs):
        page.eval_on_selector('#stage','el=>el.innerHTML=""')
        page.evaluate("""attrs=>{const i=document.createElement('freev-icon');i.id='icon';i.setAttribute('app',attrs.app||'CodeMaster_V2');delete attrs.app;for(const[k,v]of Object.entries(attrs))i.setAttribute(k,String(v));window.__errs=[];i.addEventListener('freev-icon-error',e=>window.__errs.push(String(e.detail?.error?.message||e.detail?.error||'error')));document.querySelector('#stage').append(i)}""",attrs)
        page.wait_for_timeout(180)
        return page.locator('#icon')

    # Strict animation whitelist prevents HTML/class injection and invalid animation adds no layers.
    page.evaluate('window.__pwn=0')
    payload='bogus\" onclick=\"window.__pwn=1'
    el=make(animation=payload,size=128,motion='on')
    page.wait_for_timeout(60)
    report['animation_injection_blocked']=page.evaluate("window.__pwn===0 && !document.querySelector('#icon').shadowRoot.querySelector('[onclick]')")
    report['invalid_animation_static']=page.evaluate("document.querySelector('#icon').shadowRoot.querySelectorAll('.animpart').length===0 && document.querySelector('#icon').shadowRoot.querySelectorAll('.animcover').length===0")

    # Invalid badge falls back to none, not an empty visible capsule.
    el=make(badge='bogus',size=128,motion='off')
    report['invalid_badge_hidden']=page.evaluate("document.querySelector('#icon').shadowRoot.querySelector('.badge').hidden===true")

    # Invalid global numeric configuration must use safe finite defaults.
    page.evaluate("globalThis.FREEV_ICON_CACHE_MB='abc';globalThis.FREEV_ICON_MAX_RENDER_SIDE='abc';globalThis.devicePixelRatio='abc'")
    el=make(size=256,motion='off')
    vals=page.evaluate("""()=>{const i=document.querySelector('#icon');const c=i.shadowRoot.querySelector('canvas');return {w:c.width,h:c.height,stats:getFreevIconCacheStats()}}""")
    report['invalid_globals_safe']=vals['w']==256 and vals['h']==256 and vals['stats']['maxBytes']==48*1024*1024
    page.evaluate("delete globalThis.FREEV_ICON_CACHE_MB;delete globalThis.FREEV_ICON_MAX_RENDER_SIDE")

    # Invalid asset-base: error event + fallback module asset still renders.
    el=make(size=128,**{'asset-base':'http://[invalid'})
    page.wait_for_timeout(200)
    result=page.evaluate("""()=>{const i=document.querySelector('#icon');const c=i.shadowRoot.querySelector('canvas');const ctx=c.getContext('2d');const d=ctx.getImageData(0,0,c.width,c.height).data;let nonzero=0;for(let x=3;x<d.length;x+=4)if(d[x]){nonzero++;if(nonzero>10)break}return {errs:window.__errs.length,nonzero}}""")
    report['invalid_asset_base_error_and_fallback']=result['errs']>=1 and result['nonzero']>10

    # Invalid apps must consistently emit error and fall back in standard and masked variants.
    oks=[]
    for variant in ['standard','transparent','monochrome-white']:
        el=make(app='NoSuchApp',variant=variant,size=128,motion='off')
        page.wait_for_timeout(80)
        r=page.evaluate("""()=>({errs:window.__errs.length,label:document.querySelector('#icon').getAttribute('aria-label'),has:!!document.querySelector('#icon').shadowRoot.querySelector('.w')})""")
        oks.append(r['errs']>=1 and r['has'])
    report['invalid_app_error_all_variants']=all(oks)

    # At <=32px badges become a compact dot fully inside a modest overscan.
    el=make(size=16,badge='pro',motion='off')
    r=page.evaluate("""()=>{const i=document.querySelector('#icon'),b=i.shadowRoot.querySelector('.badge'),ir=i.getBoundingClientRect(),br=b.getBoundingClientRect();return {iw:ir.width,bw:br.width,bh:br.height,left:br.left-ir.left,right:br.right-ir.left,top:br.top-ir.top,bottom:br.bottom-ir.top,text:b.textContent}}""")
    report['small_badge_inside_bounds']=r['bw']<=6 and r['bh']<=6 and r['right']<=20 and r['bottom']<=20 and r['text']==''
    browser.close()

# SSR check is run here as an independent subprocess after build if dist exists.
import subprocess
cp=subprocess.run(['node',str(ROOT/'tests/ssr_import.mjs')],cwd=ROOT,capture_output=True,text=True)
report['ssr_safe']=cp.returncode==0
report['ssr_output']=(cp.stdout+cp.stderr).strip()
report['ok']=all(v for k,v in report.items() if k not in ('console_errors','ssr_output')) and not report['console_errors']
(ROOT/'tests/V2_6_SECURITY_RUNTIME_REPORT.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
sys.exit(0 if report['ok'] else 1)
