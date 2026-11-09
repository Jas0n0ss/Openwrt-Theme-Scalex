#!/usr/bin/env bash
# Verify built IPK packages contain required theme assets
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist"
VERSION="$(tr -d '[:space:]' < "$ROOT/ucode/template/themes/echo/version")"
TMP="$OUT/verify-tmp"

fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }

check_ipk() {
	local ipk="$1"
	local name
	name="$(basename "$ipk" .ipk)"
	rm -rf "$TMP"
	mkdir -p "$TMP"

	[[ -f "$ipk" ]] || fail "missing ipk: $ipk"
	python3 "$ROOT/scripts/write-ar.py" extract "$ipk" "$TMP"

	case "$name" in
		luci-theme-echo_*)
			[[ -f "$TMP/www/luci-static/echo/css/openwrt.css" ]] || fail "missing openwrt.css in $ipk"
			[[ -f "$TMP/www/luci-static/echo/css/symbols.css" ]] || fail "missing symbols.css in $ipk"
			[[ -f "$TMP/www/luci-static/echo/img/echo-mark.svg" ]] || fail "missing echo-mark.svg in $ipk"
			[[ -f "$TMP/www/luci-static/echo/img/symbols/router.svg" ]] || fail "missing symbol set in $ipk"
			[[ -f "$TMP/www/luci-static/echo/img/openwrt-logo.svg" ]] || fail "missing openwrt-logo.svg in $ipk"
			[[ -f "$TMP/www/luci-static/echo/img/favicon.svg" ]] || fail "missing favicon.svg in $ipk"
			[[ -f "$TMP/www/luci-static/echo/css/glass.css" ]] || fail "missing glass.css in $ipk"
			[[ -f "$TMP/www/luci-static/resources/menu-echo.js" ]] || fail "missing menu-echo.js in $ipk"
			[[ -f "$TMP/www/luci-static/resources/ui-echo.js" ]] || fail "missing ui-echo.js in $ipk"
			[[ -f "$TMP/www/luci-static/resources/theme-echo.js" ]] || fail "missing theme-echo.js in $ipk"
			[[ -f "$TMP/usr/share/ucode/luci/template/themes/echo/header.ut" ]] || fail "missing header.ut in $ipk"
			grep -q "theme-openwrt" "$TMP/usr/share/ucode/luci/template/themes/echo/header.ut" || fail "header.ut missing theme-openwrt"
			grep -q "echo-menu-btn" "$TMP/usr/share/ucode/luci/template/themes/echo/header.ut" || fail "header.ut missing mobile menu"
			grep -q "theme-switch" "$TMP/usr/share/ucode/luci/template/themes/echo/header.ut" || fail "header.ut missing appearance switch"
			grep -q "renderSheet" "$TMP/www/luci-static/resources/menu-echo.js" || fail "menu-echo.js missing mobile sheet"
			grep -q "preset 'openwrt'" "$TMP/etc/config/echo" || fail "default UCI preset not openwrt"
			[[ -f "$TMP/usr/lib/lua/luci/i18n/luci-theme-echo.zh_Hans.lmo" ]] || fail "missing luci-theme-echo zh_Hans i18n"
			;;
		luci-app-echo-config_*)
			[[ -f "$TMP/www/luci-static/resources/view/echo/config.js" ]] || fail "missing config.js in $ipk"
			grep -q "accent color" "$TMP/www/luci-static/resources/view/echo/config.js" || fail "config.js missing 2.0 accent copy"
		grep -q "dashboard" "$TMP/www/luci-static/resources/view/echo/config.js" || fail "config.js missing dashboard option"
			[[ -f "$TMP/usr/lib/lua/luci/i18n/luci-app-echo-config.zh_Hans.lmo" ]] || fail "missing luci-app-echo-config zh_Hans i18n"
			;;
	esac

	echo "OK: $name"
}

[[ -f "$OUT/luci-theme-echo_${VERSION}-1_all.ipk" ]] || fail "theme ipk not found"
[[ -f "$OUT/luci-app-echo-config_${VERSION}-1_all.ipk" ]] || fail "config ipk not found"

check_ipk "$OUT/luci-theme-echo_${VERSION}-1_all.ipk"
check_ipk "$OUT/luci-app-echo-config_${VERSION}-1_all.ipk"

# Ensure legacy branding removed from source (not dist staging)
legacy=$(grep -rE 'theme-be88u|RT-BE88U|asus-logo' "$ROOT/htdocs" "$ROOT/ucode" "$ROOT/demo" "$ROOT/root" 2>/dev/null || true)
if [[ -n "$legacy" ]]; then
	echo "$legacy" >&2
	fail "legacy BE88U/ASUS references remain in source tree"
fi

rm -rf "$TMP"
echo "All checks passed for v${VERSION}"
