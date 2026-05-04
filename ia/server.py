#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔══════════════════════════════════════════════════════════╗
║  FREEV AI — Serveur (local + Render.com)                 ║
║  Local  : python server.py → localhost:7432              ║
║  Render : start command    → 0.0.0.0:$PORT               ║
╚══════════════════════════════════════════════════════════╝
"""

import json
import os
import sys
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(errors='replace')
    except Exception:
        pass

# ── Port : Render impose $PORT, sinon 7432 en local ──────────────────────────
PORT = int(os.environ.get('PORT', 7432))
HOST = '0.0.0.0'   # IMPORTANT : pas localhost — Render ne peut pas y accéder

# ── Origines autorisées pour le CORS ─────────────────────────────────────────
# Ajoute ici l'URL de ton site hébergé par l'IT (ex: https://monsite.example.com)
ALLOWED_ORIGINS = [
    'http://localhost',
    'http://127.0.0.1',
    'null',           # ouverture directe d'un fichier .html en local
]
MAX_BODY_BYTES = 16 * 1024

# ── Clé NVIDIA (DeepSeek V4 Pro) ─────────────────────────────────────────────
NVIDIA_API_KEY = os.environ.get(
    'NVIDIA_API_KEY',
    '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'
)

# ── Charger FreevBrain ────────────────────────────────────────────────────────
print("⏳ Chargement de FreevBrain v5...", flush=True)
try:
    from brain import Freev
    freev = Freev()
    print(f"✅ FreevBrain prêt — {len(freev.brain.training_data)} paires chargées", flush=True)
except Exception as e:
    print(f"❌ Erreur chargement FreevBrain : {e}", flush=True)
    print("   Assure-toi que brain.py et freev_data.txt sont dans le même dossier.", flush=True)
    sys.exit(1)


# ── Handler HTTP ──────────────────────────────────────────────────────────────
class FreevHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        """Log minimal : seulement les requêtes POST /api/chat et les erreurs."""
        if '/api/chat' in str(args):
            print(f"  [{args[1]}] {self.command} {self.path}", flush=True)

    def _cors_headers(self):
        """Headers CORS — autorise le navigateur à appeler ce serveur."""
        origin = self.headers.get('Origin', '')
        allowed = 'null'
        if origin == 'null':
            allowed = 'null'
        elif any(origin == item or origin.startswith(item + ':') for item in ALLOWED_ORIGINS):
            allowed = origin
        self.send_header('Access-Control-Allow-Origin', allowed)
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Vary', 'Origin')

    def do_OPTIONS(self):
        """Réponse pre-flight CORS (navigateur l'envoie avant chaque POST)."""
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_GET(self):
        """GET /status — vérifie que le serveur est vivant."""
        if self.path == '/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._cors_headers()
            self.end_headers()
            status = {
                'ok': True,
                'version': freev.VERSION,
                'trained': freev.brain.trained,
                'pairs': len(freev.brain.training_data),
                'personality': freev.personality,
            }
            self.wfile.write(json.dumps(status, ensure_ascii=False).encode())
        elif self.path == '/':
            # Page d'accueil simple si on visite l'URL Render directement
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self._cors_headers()
            self.end_headers()
            html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Freev AI Server</title>
<style>body{{font-family:monospace;background:#0f172a;color:#22d3ee;padding:2rem}}</style>
</head><body>
<h1>🤖 Freev AI Server v{freev.VERSION}</h1>
<p>✅ FreevBrain actif — {len(freev.brain.training_data)} paires</p>
<p>POST /api/chat — envoyer {{"message": "ta question"}}</p>
<p>GET  /status   — vérifier l'état</p>
</body></html>"""
            self.wfile.write(html.encode())
        else:
            self.send_response(404)
            self._cors_headers()
            self.end_headers()

    def do_POST(self):
        """POST /api/chat — FreevBrain | POST /api/deepseek — DeepSeek V4 Pro."""
        if self.path == '/api/deepseek':
            self._handle_deepseek()
            return
        if self.path != '/api/chat':
            self.send_response(404)
            self._cors_headers()
            self.end_headers()
            return

        try:
            length = int(self.headers.get('Content-Length', 0))
            if length <= 0:
                raise ValueError('Corps de requête vide')
            if length > MAX_BODY_BYTES:
                self._error(413, 'Message trop long')
                return

            raw = self.rfile.read(length).decode('utf-8')
            body = json.loads(raw)
            if not isinstance(body, dict):
                raise ValueError('JSON objet attendu')
            message = str(body.get('message', '')).strip()

            if not message:
                raise ValueError('Message vide')

            # ── Réponse FreevBrain ──────────────────────────────────────────
            response = freev.generate_response(message)
            if not response:
                response = "Je n'ai pas compris. Reformule ta question !"

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self._cors_headers()
            self.end_headers()
            self.wfile.write(
                json.dumps({'response': response}, ensure_ascii=False).encode('utf-8')
            )

        except json.JSONDecodeError:
            self._error(400, 'JSON invalide')
        except Exception as e:
            self._error(500, str(e))

    def _handle_deepseek(self):
        """Proxy vers l'API NVIDIA — DeepSeek V4 Pro."""
        try:
            length = int(self.headers.get('Content-Length', 0))
            if length <= 0 or length > MAX_BODY_BYTES:
                self._error(400, 'Corps invalide ou trop long')
                return

            raw  = self.rfile.read(length).decode('utf-8')
            body = json.loads(raw)
            message = str(body.get('message', '')).strip()
            if not message:
                self._error(400, 'Message vide')
                return

            payload = json.dumps({
                'model': 'deepseek-ai/deepseek-v4-pro',
                'messages': [{'role': 'user', 'content': message}],
                'temperature': 1,
                'top_p': 0.95,
                'max_tokens': 16384,
                'chat_template_kwargs': {'thinking': False},
                'stream': False,
            }, ensure_ascii=False).encode('utf-8')

            req = urllib.request.Request(
                'https://integrate.api.nvidia.com/v1/chat/completions',
                data=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {NVIDIA_API_KEY}',
                },
                method='POST'
            )

            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode('utf-8'))

            text = data.get('choices', [{}])[0].get('message', {}).get('content', '')
            if not text:
                text = "DeepSeek n'a pas renvoyé de réponse."

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self._cors_headers()
            self.end_headers()
            self.wfile.write(
                json.dumps({'response': text}, ensure_ascii=False).encode('utf-8')
            )
            print(f"  [DS] {message[:60]}...", flush=True)

        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8', errors='replace')
            print(f"  ❌ NVIDIA API HTTP {e.code}: {err_body}", flush=True)
            self._error(e.code, f'NVIDIA API error {e.code}: {err_body[:200]}')
        except Exception as e:
            print(f"  ❌ DeepSeek proxy error: {e}", flush=True)
            self._error(500, str(e))

    def _error(self, code, msg):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self._cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps({'error': msg}, ensure_ascii=False).encode('utf-8'))


# ── Lancement ─────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    server = HTTPServer((HOST, PORT), FreevHandler)
    env    = 'Render' if os.environ.get('PORT') else 'Local'
    print(f'', flush=True)
    print(f'╔══════════════════════════════════════════════════╗', flush=True)
    print(f'║  🤖 Freev AI Server — {env}                       ', flush=True)
    print(f'║  Écoute sur {HOST}:{PORT}                        ', flush=True)
    print(f'╚══════════════════════════════════════════════════╝', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n👋 Serveur arrêté.', flush=True)
        server.server_close()
