from __future__ import annotations
import os, shutil

def launch_chromium(playwright, **kwargs):
    args=list(kwargs.pop("args", []))
    for arg in ["--no-sandbox","--disable-dev-shm-usage"]:
        if arg not in args: args.append(arg)
    explicit=os.environ.get("PLAYWRIGHT_CHROMIUM_PATH")
    candidates=[explicit, shutil.which("chromium"), shutil.which("chromium-browser"), shutil.which("google-chrome"), shutil.which("google-chrome-stable"), shutil.which("chrome")]
    exe=next((x for x in candidates if x), None)
    if exe:
        return playwright.chromium.launch(executable_path=exe,args=args,**kwargs)
    # Fall back to the browser installed by Playwright itself.
    return playwright.chromium.launch(args=args,**kwargs)

def classic_runtime(root):
    """Flatten generated ES-module registry + runtime for Playwright add_script_tag(content=...)."""
    from pathlib import Path
    import re
    root=Path(root)
    generated=(root/'web/generated-apps.js').read_text(encoding='utf-8').replace('export const ','const ')
    runtime=(root/'web/freev-icon.js').read_text(encoding='utf-8')
    runtime=runtime.replace("import {LABELS,DEFAULT_ANIM,ANIM_LAYERS,ANIM_COVER,RECONSTRUCT_SYMBOL,DEFAULT_APP,APP_REGISTRY} from './generated-apps.js';",'')
    runtime=runtime.replace("function moduleBase(){return new URL('../',import.meta.url)}","function moduleBase(){return new URL('https://freev.test/')}")
    runtime=re.sub(r'export \{[^}]+\};\s*$', '', runtime)
    return generated+'\n'+runtime
