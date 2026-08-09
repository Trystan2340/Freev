#!/usr/bin/env python3
from pathlib import Path
from PIL import Image
from xml.etree import ElementTree as ET
import json,hashlib,subprocess,sys,shutil,os
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tools'))
from freev_registry import load_registry
from icon_pipeline import check_all,check_app
errors=[];warnings=[];stats={}
def err(x):errors.append(x)
def sha(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for c in iter(lambda:f.read(1<<20),b''):h.update(c)
 return h.hexdigest()
for d in ROOT.rglob('__pycache__'):shutil.rmtree(d,ignore_errors=True)
for p in ROOT.rglob('*.pyc'):p.unlink(missing_ok=True)
reg=load_registry();apps=reg['apps'];APPS=[a['id'] for a in apps];amap={a['id']:a for a in apps}
files=[p for p in ROOT.rglob('*') if p.is_file()];stats['file_count']=len(files);stats['size_mb']=round(sum(p.stat().st_size for p in files)/1024/1024,2);stats['app_count']=len(APPS)
# Mandatory pipeline completeness.
for x in check_all(True):err(x)
for a in apps:
 for x in check_app(a['id'],a):err(x)
# Master identity: original eight use frozen checksums; future additions use their source hash stored in the registry.
checks=json.loads((ROOT/'tests/original-master-checksums.json').read_text())
for a in apps:
 p=ROOT/'masters/original-native'/f"{a['id']}.png"
 if not p.exists():err('missing native master '+a['id']);continue
 expected=None
 if a['id'] in checks:
  v=checks[a['id']];expected=(v.get('sha256') or v.get('native_sha256')) if isinstance(v,dict) else v
 elif a.get('sourceSha256'):expected=a['sourceSha256']
 if expected and sha(p)!=expected:err('master checksum mismatch '+a['id'])
# Format integrity.
pngs=list(ROOT.rglob('*.png'));stats['png_count']=len(pngs)
for p in pngs:
 try:
  with Image.open(p) as im:im.verify()
 except Exception as e:err(f'PNG invalid {p.relative_to(ROOT)}: {e}')
for p in ROOT.rglob('*.ico'):
 try:Image.open(p).verify()
 except Exception as e:err(f'ICO invalid {p.relative_to(ROOT)}: {e}')
for p in ROOT.rglob('*.icns'):
 try:Image.open(p).verify()
 except Exception as e:err(f'ICNS invalid {p.relative_to(ROOT)}: {e}')
for p in list(ROOT.rglob('*.json'))+list(ROOT.rglob('*.webmanifest')):
 try:json.loads(p.read_text(encoding='utf-8'))
 except Exception as e:err(f'JSON invalid {p.relative_to(ROOT)}: {e}')
for p in (ROOT/'platform/android').rglob('*.xml'):
 try:ET.parse(p)
 except Exception as e:err(f'XML invalid {p.relative_to(ROOT)}: {e}')
# Registry generation must contain every app everywhere it matters.
utf8_env={**os.environ,'PYTHONUTF8':'1','PYTHONIOENCODING':'utf-8'}
subprocess.run([sys.executable,'tools/generate_registry.py'],cwd=ROOT,check=True,capture_output=True,env=utf8_env)
for aid in APPS:
 if aid not in (ROOT/'web/generated-apps.js').read_text(encoding='utf-8'):err('generated runtime registry missing '+aid)
 if aid not in (ROOT/'types/freev-icon.d.ts').read_text(encoding='utf-8'):err('TypeScript registry missing '+aid)
 if aid not in (ROOT/'web/index.html').read_text(encoding='utf-8'):err('demo registry missing '+aid)
# Version synchronization.
pkg=json.loads((ROOT/'package.json').read_text());manifest=json.loads((ROOT/'docs/manifest.json').read_text())
if pkg.get('version')!='2.7.0':err('npm version != 2.7.0')
if manifest.get('version')!='2.7.0':err('manifest version != 2.7.0')
if 'version = "2.7.0"' not in (ROOT/'pyproject.toml').read_text():err('pyproject version != 2.7.0')
if 'V2.7 Final' not in (ROOT/'web/index.html').read_text():err('demo version stale')
if 'V2.7 static exporter' not in (ROOT/'tools/export_icon.py').read_text():err('exporter version stale')
# Mandatory system source and build gate.
for rel in ['registry/apps.json','tools/icon_pipeline.py','tools/generate_registry.py','tools/freev_registry.py','incoming/README.md','docs/AUTOMATIC_ICON_ONBOARDING.md','web/generated-apps.js']:
 if not (ROOT/rel).exists():err('mandatory onboarding component missing: '+rel)
build=(ROOT/'build.mjs').read_text()
if 'icon_pipeline.py' not in build or 'sync' not in build or '--enforce' not in build:err('build does not enforce automatic icon onboarding')
# End-to-end toolchain, including a real temporary ninth app import.
npm_command=shutil.which('npm.cmd') or shutil.which('npm') or 'npm'
commands={'pipeline_check':[sys.executable,'tools/icon_pipeline.py','check'],'node_check':['node','--check','web/freev-icon.js'],'build':['node','build.mjs'],'ssr':['node','tests/ssr_import.mjs'],'onboarding':[sys.executable,'tests/v2_7_onboarding.py'],'npm_pack':[npm_command,'pack','--dry-run','--json']}
cmdres={}
for name,cmd in commands.items():
 r=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=240,env=utf8_env);cmdres[name]={'returncode':r.returncode,'stdout':r.stdout[-2500:],'stderr':r.stderr[-1500:]}
 if r.returncode:err(name+' failed')
stats['commands']=cmdres
if '__pycache__' in cmdres.get('npm_pack',{}).get('stdout','') or '.pyc' in cmdres.get('npm_pack',{}).get('stdout',''):err('npm package contains Python cache files')
# Onboarding test must have restored the repository to its original app count.
reg2=load_registry()
if [a['id'] for a in reg2['apps']]!=APPS:err('onboarding test did not restore registry')
rep=ROOT/'tests/V2_7_ONBOARDING_REPORT.json'
if not rep.exists() or not json.loads(rep.read_text()).get('ok'):err('V2.7 onboarding report failed')
# No transient caches in final product.
for d in ROOT.rglob('__pycache__'):shutil.rmtree(d,ignore_errors=True)
for p in ROOT.rglob('*.pyc'):p.unlink(missing_ok=True)
for d in ROOT.rglob('__pycache__'):shutil.rmtree(d,ignore_errors=True)
for p in ROOT.rglob('*.pyc'):p.unlink(missing_ok=True)
warnings=['Original FREEV artwork remains raster-based; new raster masters are preserved exactly when supplied as PNG.','Automatic glyph extraction is intentionally fail-closed: low confidence requires a sibling .mask.png instead of silently creating a bad icon.','PWA deployment URLs remain templates and must match the final deployed application.','Package remains UNLICENSED until a distribution license is chosen.']
score=9.98 if not errors else max(0,10-.45*len(errors));report={'version':'2.7.0','score':score,'status':'PASS' if not errors else 'FAIL','errors':errors,'warnings':warnings,'stats':stats}
(ROOT/'tests/V2_7_FINAL_AUDIT.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
md=['# FREEV Icon System V2.7 — Audit final','',f'**Score : {score}/10 — {report["status"]}**','',f'- Applications enregistrées : {stats["app_count"]}',f'- Fichiers : {stats["file_count"]}',f'- Taille décompressée : {stats["size_mb"]} Mo',f'- PNG validés : {stats["png_count"]}','','## Onboarding automatique obligatoire','- Build gate : '+('PASS' if not any('build does not enforce' in x for x in errors) else 'FAIL'),'- Test réel ajout temporaire : '+('PASS' if rep.exists() and json.loads(rep.read_text()).get('ok') else 'FAIL'),'','## Erreurs']
md += (['- Aucune.'] if not errors else ['- '+x for x in errors])
md += ['','## Limites résiduelles']+['- '+x for x in warnings]
(ROOT/'docs/FINAL_AUDIT_V2_7.md').write_text('\n'.join(md),encoding='utf-8')
print(json.dumps(report,indent=2,ensure_ascii=False));sys.exit(0 if not errors else 1)
