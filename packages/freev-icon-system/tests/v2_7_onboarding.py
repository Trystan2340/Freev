#!/usr/bin/env python3
from pathlib import Path
import json,shutil,subprocess,sys
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'))
from freev_registry import load_registry,REGISTRY_PATH
from icon_pipeline import cleanup_app,check_app
APP='AutoPipeline_Test';src=ROOT/'masters/original-native/CodeMaster_V2.png';incoming=ROOT/'incoming'/f'{APP}.png';meta=incoming.with_suffix('.json');report={'app':APP,'processed':False,'build_gate_auto_process':False,'registry':False,'outputs':False,'generated_runtime':False,'typescript':False,'cleanup':False,'ok':False}
def restore():
 try:
  reg=load_registry();had=any(a['id']==APP for a in reg['apps'])
  if had:
   reg['apps']=[a for a in reg['apps'] if a['id']!=APP];REGISTRY_PATH.write_text(json.dumps(reg,indent=2,ensure_ascii=False),encoding='utf-8')
  cleanup_app(APP);incoming.unlink(missing_ok=True);meta.unlink(missing_ok=True);(ROOT/'incoming'/f'{APP}.mask.png').unlink(missing_ok=True)
  subprocess.run([sys.executable,str(ROOT/'tools/generate_registry.py')],cwd=ROOT,check=True,capture_output=True)
  if had: subprocess.run(['node','build.mjs'],cwd=ROOT,check=True,capture_output=True,timeout=120)
  report['cleanup']=True
 except Exception as e:report['cleanup_error']=str(e)
try:
 restore();shutil.copy2(src,incoming);meta.write_text(json.dumps({'id':APP,'label':'Auto Pipeline Test','kind':'game','shortName':'AutoTest','animation':'pulse-play'},indent=2),encoding='utf-8')
 r=subprocess.run(['node','build.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=240)
 report['stdout']=r.stdout[-2500:];report['stderr']=r.stderr[-2500:]
 if r.returncode:raise RuntimeError('sync failed')
 report['processed']=not incoming.exists();report['build_gate_auto_process']='FREEV auto-added' in report['stdout'];reg=load_registry();report['registry']=any(a['id']==APP for a in reg['apps']);entry=next(a for a in reg['apps'] if a['id']==APP)
 report['outputs']=not check_app(APP,entry)
 report['generated_runtime']=APP in (ROOT/'web/generated-apps.js').read_text(encoding='utf-8')
 report['typescript']=APP in (ROOT/'types/freev-icon.d.ts').read_text(encoding='utf-8')
 report['ok']=all(report[k] for k in ['processed','build_gate_auto_process','registry','outputs','generated_runtime','typescript'])
except Exception as e:report['error']=str(e)
finally:
 restore();report['ok']=bool(report.get('ok') and report.get('cleanup'))
 (ROOT/'tests/V2_7_ONBOARDING_REPORT.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
 print(json.dumps(report,indent=2,ensure_ascii=False));sys.exit(0 if report['ok'] else 1)
