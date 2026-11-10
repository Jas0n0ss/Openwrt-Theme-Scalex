#!/usr/bin/env bash
# Build .ipk packages for luci-theme-scalex and luci-app-scalex-config
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist"
ARCH="${ARCH:-all}"
VERSION="$(tr -d '[:space:]' < "$ROOT/ucode/template/themes/scalex/version")"
RELEASE="${RELEASE:-1}"
I18N_DIR="$OUT/i18n"
I18N_INSTALL="usr/lib/lua/luci/i18n"

build_ipk() {
	local name="$1"
	local title="$2"
	local depends="$3"
	local staging="$OUT/staging-$name"
	local control_dir="$OUT/control-$name"
	local data_root="$staging/root"
	local ipk="$OUT/${name}_${VERSION}-${RELEASE}_${ARCH}.ipk"

	rm -rf "$staging" "$control_dir" "$ipk"
	mkdir -p "$data_root" "$control_dir"

	case "$name" in
		luci-theme-scalex)
			mkdir -p "$data_root/www/luci-static/scalex"
			mkdir -p "$data_root/www/luci-static/resources"
			mkdir -p "$data_root/usr/share/ucode/luci/template/themes/scalex"
			mkdir -p "$data_root/etc/uci-defaults"
			mkdir -p "$data_root/etc/config"

			cp -R "$ROOT/htdocs/luci-static/scalex/." "$data_root/www/luci-static/scalex/"
			cp "$ROOT/htdocs/luci-static/resources/menu-bootstrap-core.js" "$data_root/www/luci-static/resources/"
			cp "$ROOT/htdocs/luci-static/resources/menu-scalex.js" "$data_root/www/luci-static/resources/"
			cp "$ROOT/htdocs/luci-static/resources/ui-scalex.js" "$data_root/www/luci-static/resources/"
			cp "$ROOT/htdocs/luci-static/resources/theme-scalex.js" "$data_root/www/luci-static/resources/"
			cp "$ROOT/htdocs/luci-static/resources/dashboard-scalex.js" "$data_root/www/luci-static/resources/"
			cp "$ROOT/ucode/template/themes/scalex/"*.ut "$data_root/usr/share/ucode/luci/template/themes/scalex/"
			cp "$ROOT/ucode/template/themes/scalex/version" "$data_root/usr/share/ucode/luci/template/themes/scalex/"
			cp "$ROOT/root/etc/uci-defaults/30_luci-theme-scalex" "$data_root/etc/uci-defaults/"
			chmod 755 "$data_root/etc/uci-defaults/30_luci-theme-scalex"
			cp "$ROOT/root/etc/config/scalex" "$data_root/etc/config/"
			mkdir -p "$data_root/$I18N_INSTALL"
			cp "$I18N_DIR/luci-theme-scalex.zh_Hans.lmo" "$data_root/$I18N_INSTALL/"
			cp "$ROOT/ipkg/postinst" "$control_dir/postinst"
			chmod 755 "$control_dir/postinst"
			;;
		luci-app-scalex-config)
			mkdir -p "$data_root/www/luci-static/resources/view/scalex"
			mkdir -p "$data_root/usr/share/luci/menu.d"
			mkdir -p "$data_root/usr/share/rpcd/acl.d"
			mkdir -p "$data_root/etc/uci-defaults"
			mkdir -p "$data_root/www/luci-static/scalex/background"

			cp "$ROOT/luci-app-scalex-config/htdocs/luci-static/resources/view/scalex/config.js" \
				"$data_root/www/luci-static/resources/view/scalex/"
			cp "$ROOT/luci-app-scalex-config/root/usr/share/luci/menu.d/luci-app-scalex-config.json" \
				"$data_root/usr/share/luci/menu.d/"
			cp "$ROOT/luci-app-scalex-config/root/usr/share/rpcd/acl.d/luci-app-scalex-config.json" \
				"$data_root/usr/share/rpcd/acl.d/"
			cp "$ROOT/luci-app-scalex-config/root/etc/uci-defaults/50_luci-scalex-config" \
				"$data_root/etc/uci-defaults/"
			chmod 755 "$data_root/etc/uci-defaults/50_luci-scalex-config"
			mkdir -p "$data_root/$I18N_INSTALL"
			cp "$I18N_DIR/luci-app-scalex-config.zh_Hans.lmo" "$data_root/$I18N_INSTALL/"
			;;
		*)
			echo "Unknown package: $name" >&2
			exit 1
			;;
	esac

	# Normalise archive permissions: files 0644, directories 0755, scripts 0755.
	find "$data_root" -type d -exec chmod 755 {} +
	find "$data_root" -type f -exec chmod 644 {} +
	if [ -f "$data_root/etc/uci-defaults/30_luci-theme-scalex" ]; then
		chmod 755 "$data_root/etc/uci-defaults/30_luci-theme-scalex"
	fi
	if [ -f "$data_root/etc/uci-defaults/50_luci-scalex-config" ]; then
		chmod 755 "$data_root/etc/uci-defaults/50_luci-scalex-config"
	fi

	cat > "$control_dir/control" <<EOF
Package: $name
Version: $VERSION-$RELEASE
Depends: $depends
Architecture: $ARCH
Section: luci
Category: LuCI
Title: $title
Description: $title for OpenWrt LuCI
EOF

	COPYFILE_DISABLE=1 tar --format=ustar -C "$data_root" --exclude='._*' --exclude='.DS_Store' -czf "$control_dir/data.tar.gz" .
	if [[ -f "$control_dir/postinst" ]]; then
		COPYFILE_DISABLE=1 tar --format=ustar -C "$control_dir" --exclude='._*' --exclude='.DS_Store' -czf "$control_dir/control.tar.gz" control postinst
	else
		COPYFILE_DISABLE=1 tar --format=ustar -C "$control_dir" --exclude='._*' --exclude='.DS_Store' -czf "$control_dir/control.tar.gz" control
	fi
	printf '2.0\n' > "$control_dir/debian-binary"

	# OpenWrt 24.10+ expects the .ipk itself to be a gzipped tar containing
	# debian-binary, data.tar.gz and control.tar.gz. The old ar wrapper is not
	# accepted by current opkg.
	COPYFILE_DISABLE=1 tar --format=ustar -C "$control_dir" --exclude='._*' --exclude='.DS_Store' \
		-czf "$ipk" debian-binary data.tar.gz control.tar.gz

	echo "Built: $ipk ($(du -h "$ipk" | cut -f1))"
}

mkdir -p "$OUT"
rm -f "$OUT"/*.ipk
chmod +x "$ROOT/scripts/compile-i18n.sh"
"$ROOT/scripts/compile-i18n.sh" "$I18N_DIR"
build_ipk "luci-theme-scalex" "ScaleX 3.1 - Apple-inspired LuCI theme" "libc, luci-theme-bootstrap"
build_ipk "luci-app-scalex-config" "ScaleX Theme Configuration" "luci-theme-scalex, luci-base"

echo ""
echo "Done. Packages in $OUT/"
ls -lh "$OUT"/*.ipk
