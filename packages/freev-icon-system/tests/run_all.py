from pathlib import Path
import subprocess,sys,shutil
ROOT=Path(__file__).resolve().parents[1]
steps=[
 [sys.executable,str(ROOT/'tests/test_pack.py')],
 [sys.executable,str(ROOT/'tests/v2_4_edge_cases.py')],
 [sys.executable,str(ROOT/'tests/v2_5_interaction.py')],
 [sys.executable,str(ROOT/'tests/browser_visual_regression.py')],
 ['node','--check',str(ROOT/'web/freev-icon.js')],
 ['node',str(ROOT/'build.mjs')],
 ['node',str(ROOT/'tests/ssr_import.mjs')],
 [sys.executable,str(ROOT/'tests/v2_6_security_runtime.py')],
 [sys.executable,str(ROOT/'tests/v2_7_onboarding.py')],
]
for cmd in steps:
 r=subprocess.run(cmd,cwd=ROOT)
 if r.returncode: raise SystemExit(r.returncode)
# Test runs may create Python caches; remove them so build artifacts stay reproducible.
for d in ROOT.rglob('__pycache__'):
 shutil.rmtree(d,ignore_errors=True)
for f in ROOT.rglob('*.pyc'):
 try:f.unlink()
 except FileNotFoundError:pass
print('FREEV V2.7 full test suite OK')
