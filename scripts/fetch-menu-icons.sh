#!/usr/bin/env bash
# Fetch OpenWrt official dashboard SVG icons used by the ScaleX menu bar.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/htdocs/luci-static/scalex/icons/menu"
BASE="https://raw.githubusercontent.com/openwrt/luci/master/modules/luci-mod-dashboard/htdocs/luci-static/resources/view/dashboard/icons"

mkdir -p "$DEST"

fetch() {
	local name="$1"
	local out="$2"
	curl -fsSL "$BASE/$name" -o "$DEST/$out"
	echo "Fetched $out"
}

fetch router.svg _router.raw.svg
fetch wireless.svg _wireless.raw.svg
fetch devices.svg _devices.raw.svg

echo "Done. Normalize stroke to currentColor in system.svg / wireless.svg / clients.svg as needed."
