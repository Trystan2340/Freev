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
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# ── Port : Render impose $PORT, sinon 7432 en local ──────────────────────────
PORT = int(os.environ.get('PORT', 7432))
HOST = '0.0.0.0'   # IMPORTANT : pas localhost — Render ne peut pas y accéder

# ── Origines autorisées pour le CORS ─────────────────────────────────────────
# Ajoute ici l'URL de ton site hébergé par l'IT (ex: https://monsite.example.com)
ALLOWED_ORIGINS = [
    'http://localhost',
    'http://127.0.0.1',
    'null',           # ouverture directe d'un fichier .html en local
    '*',              # autorise tout (à restreindre en prod si souhaité)
]

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
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

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
        """POST /api/chat — endpoint principal."""
        if self.path != '/api/chat':
            self.send_response(404)
            self._cors_headers()
            self.end_headers()
            return

        try:
            length  = int(self.headers.get('Content-Length', 0))
            body    = json.loads(self.rfile.read(length).decode('utf-8'))
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

    def _error(self, code, msg):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self._cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps({'error': msg}).encode())


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
