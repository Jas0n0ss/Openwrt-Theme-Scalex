#!/usr/bin/env bash
# Run the Firefox smoke test in a Linux Playwright container.
# Useful on macOS where the bundled Firefox build may not launch headlessly.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCH="$(uname -m)"
case "$ARCH" in
arm64|aarch64) PLATFORM="linux/arm64" ;;
*)             PLATFORM="linux/amd64" ;;
esac
BASE="${ECHO_DEMO_URL:-http://host.docker.internal:9080/demo/}"

docker run --rm --platform "$PLATFORM" \
	-v "$ROOT:/repo" \
	-w /repo \
	mcr.microsoft.com/playwright/python:v1.50.0-noble \
	sh -c "pip install -q playwright==1.50.0 && python tests/ui-smoke.py --base-url '$BASE' --engine firefox"
