#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔══════════════════════════════════════════════════════════╗
║  FREEV AI — Serveur local                                ║
║  Lance avec : python server.py                           ║
║  Expose FreevBrain sur http://localhost:7432             ║
╚══════════════════════════════════════════════════════════╝
"""

import json
import os
import sys
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# ── Port (env var PORT pour Render/Railway, 7432 en local) ───────────────────
PORT = int(os.environ.get("PORT", 7432))

# ── Charger FreevBrain ────────────────────────────────────────────────────────
print("⏳ Chargement de FreevBrain v5...")
try:
    from brain import Freev
    freev = Freev()
    print(f"✅ FreevBrain prêt ! {freev.brain.status()}")
except Exception as e:
    print(f"❌ Erreur chargement FreevBrain : {e}")
    print("   Assure-toi que brain.py et freev_data.txt sont dans le même dossier.")
    sys.exit(1)


# ── Handler HTTP ──────────────────────────────────────────────────────────────
class FreevHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        """Silencieux — n'affiche que les erreurs."""
        if args and str(args[1]) not in ('200', '204'):
            print(f"  [{args[1]}] {args[0] % args[2:]}")

    def _cors_headers(self):
        """Headers CORS pour autoriser le navigateur local."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        """Réponse aux pre-flight CORS."""
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_GET(self):
        """Status du serveur."""
        if self.path == "/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._cors_headers()
            self.end_headers()
            status = {
                "ok": True,
                "version": freev.VERSION,
                "trained": freev.brain.trained,
                "pairs": len(freev.brain.training_data),
                "personality": freev.personality,
            }
            self.wfile.write(json.dumps(status, ensure_ascii=False).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        """Endpoint principal : POST /api/chat"""
        if self.path != "/api/chat":
            self.send_response(404)
            self.end_headers()
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            body   = json.loads(self.rfile.read(length).decode("utf-8"))
            message = str(body.get("message", "")).strip()

            if not message:
                raise ValueError("Message vide")

            # Générer la réponse via FreevBrain
            response = freev.generate_response(message)
            if not response:
                response = "Je n\'ai pas compris. Reformule ou enrichis freev_data.txt."

            # ── Auto-apprentissage : enrichit le cerveau à chaque requête ────
            try:
                if hasattr(freev.brain, 'learn'):
                    freev.brain.learn(message, response)
                if hasattr(freev.brain, 'save'):
                    freev.brain.save()
                elif hasattr(freev, 'save'):
                    freev.save()
            except Exception:
                pass  # Ne bloque pas si brain.py n'a pas encore ces méthodes

            # Répondre en JSON
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._cors_headers()
            self.end_headers()
            payload = json.dumps({"response": response}, ensure_ascii=False)
            self.wfile.write(payload.encode("utf-8"))

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self._cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())


# ── Lancement ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), FreevHandler)
    print(f"")
    print(f"╔══════════════════════════════════════════════════════════╗")
    print(f"║  🤖 Freev AI Server — port {PORT}                        ║")
    print(f"║  En ligne sur Render/Railway, ou localhost en local      ║")
    print(f"║  Ctrl+C pour arrêter                                     ║")
    print(f"╚══════════════════════════════════════════════════════════╝")
    print(f"")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Serveur arrêté.")
        server.server_close()
