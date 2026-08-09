#!/usr/bin/env python3
from pathlib import Path
import argparse,sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from freev_render import render_icon
ap=argparse.ArgumentParser(description='FREEV Icon System V2.7 static exporter')
ap.add_argument('--app',required=True);ap.add_argument('--theme',default='cyan');ap.add_argument('--mode',default='dark',choices=['light','dark']);ap.add_argument('--style',default='standard',choices=['standard','glass','monochrome-white','monochrome-black','monochrome-brand','transparent','small-simplified']);ap.add_argument('--state',default='default',choices=['default','hover','active','disabled','loading']);ap.add_argument('--badge',default='none',choices=['none','new','update','beta','pro','notification','download']);ap.add_argument('--size',type=int,default=512);ap.add_argument('--format',default='png',choices=['png','webp','ico']);ap.add_argument('--out',required=True)
a=ap.parse_args();
if a.state=='loading':
    ap.error("state=loading is animated and cannot be represented by a static export; use tools/export_animation.py instead")
if not (12 <= a.size <= 2048):
    ap.error("--size must be between 12 and 2048 pixels")
im=render_icon(a.app,a.theme,a.mode,a.style,a.state,a.badge,a.size);out=Path(a.out);out.parent.mkdir(parents=True,exist_ok=True)
if a.format=='png':im.save(out,'PNG')
elif a.format=='webp':im.save(out,'WEBP',quality=95,method=6)
else:im.save(out,'ICO',sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
print(out)
