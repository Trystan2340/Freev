#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright
from urllib.parse import urlparse, unquote
import json, mimetypes, sys
from browser_utils import launch_chromium,classic_runtime

ROOT=Path(__file__).resolve().parents[1]
report={
  'pointer_activate_once':False,
  'keyboard_enter_activate_once':False,
  'keyboard_space_activate_once':False,
  'noninteractive_no_activate':False,
  'disabled_no_activate':False,
  'size_cap_2048':False,
  'console_errors':[]
}
runtime=classic_runtime(ROOT)

with sync_playwright() as p:
    browser=launch_chromium(p,headless=True)
    page=browser.new_page(viewport={'width':2300,'height':900},device_scale_factor=1)
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
    page.set_content('<!doctype html><html data-freev-theme="cyan"><style>html,body{margin:0}#stage{padding:20px}</style><div id="stage"></div></html>')
    page.evaluate("globalThis.FREEV_ICON_ASSET_BASE='https://freev.test/'")
    page.add_script_tag(content=runtime)

    def make(**attrs):
        page.eval_on_selector('#stage','el=>el.innerHTML=""')
        page.evaluate("""attrs=>{const i=document.createElement('freev-icon');i.id='icon';i.setAttribute('app','CodeMaster_V2');for(const[k,v]of Object.entries(attrs))i.setAttribute(k,String(v));document.querySelector('#stage').append(i)}""",attrs)
        page.wait_for_timeout(120)
        return page.locator('#icon')

    # Pointer click => exactly one activate and one click.
    el=make(size=96,interactive='',motion='off')
    page.evaluate("window.__a=0;window.__c=0;const i=document.querySelector('#icon');i.addEventListener('freev-activate',()=>window.__a++);i.addEventListener('click',()=>window.__c++)")
    el.click(); page.wait_for_timeout(30)
    report['pointer_activate_once']=page.evaluate('window.__a===1&&window.__c===1')

    # Enter => same path, exactly one activate and one click.
    page.evaluate('window.__a=0;window.__c=0')
    el.focus(); page.keyboard.press('Enter'); page.wait_for_timeout(30)
    report['keyboard_enter_activate_once']=page.evaluate('window.__a===1&&window.__c===1')

    # Space => same path, exactly one activate and one click.
    page.evaluate('window.__a=0;window.__c=0')
    el.focus(); page.keyboard.press('Space'); page.wait_for_timeout(30)
    report['keyboard_space_activate_once']=page.evaluate('window.__a===1&&window.__c===1')

    # Non-interactive click must not emit freev-activate.
    el=make(size=96,motion='off')
    page.evaluate("window.__a=0;window.__c=0;const i=document.querySelector('#icon');i.addEventListener('freev-activate',()=>window.__a++);i.addEventListener('click',()=>window.__c++)")
    el.click(); page.wait_for_timeout(20)
    report['noninteractive_no_activate']=page.evaluate('window.__a===0&&window.__c===1')

    # Disabled interactive blocks both pointer and keyboard activation.
    el=make(size=96,interactive='',state='disabled',motion='off')
    page.evaluate("window.__a=0;window.__c=0;const i=document.querySelector('#icon');i.addEventListener('freev-activate',()=>window.__a++);i.addEventListener('click',()=>window.__c++)")
    el.click(force=True); page.wait_for_timeout(20)
    page.evaluate("document.querySelector('#icon').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))")
    page.wait_for_timeout(20)
    report['disabled_no_activate']=page.evaluate('window.__a===0&&window.__c===0')

    # Oversized public value is clamped to 2048px.
    el=make(size=999999,motion='off')
    box=el.bounding_box()
    report['size_cap_2048']=bool(box and abs(box['width']-2048)<.5 and abs(box['height']-2048)<.5)
    browser.close()

report['ok']=all(v for k,v in report.items() if k!='console_errors') and not report['console_errors']
(ROOT/'tests/V2_5_INTERACTION_REPORT.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
sys.exit(0 if report['ok'] else 1)
