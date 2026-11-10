#!/usr/bin/env bash
# Compile .po translation files to LuCI .lmo catalogs
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/dist/i18n}"

if ! command -v msgfmt >/dev/null 2>&1; then
	echo "msgfmt not found (install gettext package)" >&2
	exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT"

compile_po() {
	local po="$1"
	local domain="$2"
	local lang="$3"
	local lmo="$OUT/${domain}.${lang}.lmo"

	msgfmt -o "$lmo" "$po"
	echo "Compiled: $(basename "$lmo")"
}

compile_po "$ROOT/po/zh_Hans/luci-theme-scalex.po" "luci-theme-scalex" "zh_Hans"
compile_po "$ROOT/luci-app-scalex-config/po/zh_Hans/luci-app-scalex-config.po" "luci-app-scalex-config" "zh_Hans"
