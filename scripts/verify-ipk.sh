#!/usr/bin/env bash
# Verify built IPK packages contain required theme assets
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist"
VERSION="$(tr -d '[:space:]' < "$ROOT/ucode/template/themes/scalex/version")"
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
		luci-theme-scalex_*)
			[[ -f "$TMP/www/luci-static/scalex/css/openwrt.css" ]] || fail "missing openwrt.css in $ipk"
			[[ -f "$TMP/www/luci-static/scalex/css/symbols.css" ]] || fail "missing symbols.css in $ipk"
			[[ -f "$TMP/www/luci-static/scalex/img/scalex-mark.svg" ]] || fail "missing scalex-mark.svg in $ipk"
			[[ -f "$TMP/www/luci-static/scalex/img/symbols/router.svg" ]] || fail "missing symbol set in $ipk"
			[[ -f "$TMP/www/luci-static/scalex/img/openwrt-logo.svg" ]] || fail "missing openwrt-logo.svg in $ipk"
			[[ -f "$TMP/www/luci-static/scalex/img/favicon.svg" ]] || fail "missing favicon.svg in $ipk"
			[[ -f "$TMP/www/luci-static/scalex/css/glass.css" ]] || fail "missing glass.css in $ipk"
			[[ -f "$TMP/www/luci-static/resources/menu-scalex.js" ]] || fail "missing menu-scalex.js in $ipk"
			[[ -f "$TMP/www/luci-static/resources/ui-scalex.js" ]] || fail "missing ui-scalex.js in $ipk"
			[[ -f "$TMP/www/luci-static/resources/theme-scalex.js" ]] || fail "missing theme-scalex.js in $ipk"
			[[ -f "$TMP/usr/share/ucode/luci/template/themes/scalex/header.ut" ]] || fail "missing header.ut in $ipk"
			grep -q "theme-openwrt" "$TMP/usr/share/ucode/luci/template/themes/scalex/header.ut" || fail "header.ut missing theme-openwrt"
			grep -q "scalex-menu-btn" "$TMP/usr/share/ucode/luci/template/themes/scalex/header.ut" || fail "header.ut missing mobile menu"
			grep -q "theme-switch" "$TMP/usr/share/ucode/luci/template/themes/scalex/header.ut" || fail "header.ut missing appearance switch"
			grep -q "cbi.js" "$TMP/usr/share/ucode/luci/template/themes/scalex/header.ut" || fail "header.ut missing cbi.js"
			grep -q "index(dist" "$TMP/usr/share/ucode/luci/template/themes/scalex/footer.ut" || fail "footer.ut still uses unsupported regex"
			grep -q "baseclass.extend" "$TMP/www/luci-static/resources/menu-bootstrap-core.js" || fail "menu core is not a LuCI class"
			[[ -f "$TMP/www/luci-static/scalex/js/legacy.js" ]] || fail "missing legacy.js"
			[[ -f "$TMP/www/luci-static/scalex/css/legacy.css" ]] || fail "missing legacy.css"
			grep -q "renderSheet" "$TMP/www/luci-static/resources/menu-scalex.js" || fail "menu-scalex.js missing mobile sheet"
			grep -q "preset 'openwrt'" "$TMP/etc/config/scalex" || fail "default UCI preset not openwrt"
			[[ -f "$TMP/usr/lib/lua/luci/i18n/luci-theme-scalex.zh_Hans.lmo" ]] || fail "missing luci-theme-scalex zh_Hans i18n"
			;;
		luci-app-scalex-config_*)
			[[ -f "$TMP/www/luci-static/resources/view/scalex/config.js" ]] || fail "missing config.js in $ipk"
			grep -q "accent color" "$TMP/www/luci-static/resources/view/scalex/config.js" || fail "config.js missing 2.0 accent copy"
		grep -q "dashboard" "$TMP/www/luci-static/resources/view/scalex/config.js" || fail "config.js missing dashboard option"
			[[ -f "$TMP/usr/lib/lua/luci/i18n/luci-app-scalex-config.zh_Hans.lmo" ]] || fail "missing luci-app-scalex-config zh_Hans i18n"
			;;
	esac

	echo "OK: $name"
}

[[ -f "$OUT/luci-theme-scalex_${VERSION}-1_all.ipk" ]] || fail "theme ipk not found"
[[ -f "$OUT/luci-app-scalex-config_${VERSION}-1_all.ipk" ]] || fail "config ipk not found"

python3 "$ROOT/scripts/check-ipk-format.py" "$OUT/luci-theme-scalex_${VERSION}-1_all.ipk"
python3 "$ROOT/scripts/check-ipk-format.py" "$OUT/luci-app-scalex-config_${VERSION}-1_all.ipk"

check_ipk "$OUT/luci-theme-scalex_${VERSION}-1_all.ipk"
check_ipk "$OUT/luci-app-scalex-config_${VERSION}-1_all.ipk"

# Ensure legacy branding removed from source (not dist staging)
legacy=$(grep -rE 'theme-be88u|RT-BE88U|asus-logo' "$ROOT/htdocs" "$ROOT/ucode" "$ROOT/demo" "$ROOT/root" 2>/dev/null || true)
if [[ -n "$legacy" ]]; then
	echo "$legacy" >&2
	fail "legacy BE88U/ASUS references remain in source tree"
fi

rm -rf "$TMP"
echo "All checks passed for v${VERSION}"
