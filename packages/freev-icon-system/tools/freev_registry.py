from __future__ import annotations
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
REGISTRY_PATH=ROOT/'registry/apps.json'
SUPPORTED_ANIMATIONS={'glow-code','pulse-play','flow-cards','draw-pencil','lock-vault','convert-swap','pixel-spark','resume-reveal'}
ID_RE=re.compile(r'^[A-Za-z][A-Za-z0-9_]{1,63}$')

def validate_label(value, field='label', max_length=80):
    if not isinstance(value,str): raise ValueError(f'{field} must be a string')
    value=value.strip()
    if not value or len(value)>max_length: raise ValueError(f'{field} must contain 1 to {max_length} characters')
    if '<' in value or '>' in value or any(ord(char)<32 for char in value): raise ValueError(f'{field} contains unsafe characters')
    return value

def script_safe_json(value, **kwargs):
    # JSON intégré à une balise script : aucune valeur ne peut fermer la balise.
    return (json.dumps(value,**kwargs)
        .replace('&','\\u0026').replace('<','\\u003c').replace('>','\\u003e')
        .replace('\u2028','\\u2028').replace('\u2029','\\u2029'))

def load_registry():
    data=json.loads(REGISTRY_PATH.read_text(encoding='utf-8'))
    if data.get('schema')!=1: raise ValueError('Unsupported FREEV registry schema')
    ids=set()
    for app in data.get('apps',[]):
        aid=app.get('id','')
        if not ID_RE.fullmatch(aid): raise ValueError(f'Invalid app id in registry: {aid!r}')
        if aid in ids: raise ValueError(f'Duplicate app id: {aid}')
        ids.add(aid)
        validate_label(app.get('label'),f'label for {aid}')
        if app.get('kind') not in {'software','game'}: raise ValueError(f'Invalid kind for {aid}')
        if app.get('animation') not in SUPPORTED_ANIMATIONS: raise ValueError(f'Unsupported animation for {aid}')
        if not isinstance(app.get('animationLayers'),int) or app['animationLayers']<1: raise ValueError(f'Invalid animationLayers for {aid}')
    if data.get('defaultApp') not in ids: raise ValueError('defaultApp must exist in registry')
    return data

def app_map(): return {a['id']:a for a in load_registry()['apps']}
