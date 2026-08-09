#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
python3 tools/icon_pipeline.py watch
