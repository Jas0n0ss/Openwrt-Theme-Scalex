#!/usr/bin/env bash
# Local UI demo server — open http://localhost:8080/demo/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-9080}"
echo "ScaleX Theme Demo → http://127.0.0.1:${PORT}/demo/"
echo "Press Ctrl+C to stop."
cd "$ROOT"
python3 -m http.server "$PORT"
