#!/usr/bin/env bash
# Run Echo on a real OpenWrt 24.10 userland (uhttpd + ucode) inside Docker.
#
# This is intentionally a sandbox, not a replacement for a physical router:
# the x86_64 rootfs runs through QEMU on Apple Silicon.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="${OPENWRT_NAME:-echo-router}"
IMAGE="${OPENWRT_IMAGE:-openwrt/rootfs:x86_64-openwrt-24.10}"
PORT="${OPENWRT_PORT:-18080}"
VERSION="$(tr -d '[:space:]' < "$ROOT/ucode/template/themes/echo/version")"
THEME="$ROOT/dist/luci-theme-echo_${VERSION}-1_all.ipk"
CONFIG="$ROOT/dist/luci-app-echo-config_${VERSION}-1_all.ipk"

case "${1:-start}" in
start)
	[[ -f "$THEME" && -f "$CONFIG" ]] || {
		echo "Missing dist packages. Run ./scripts/build-ipk.sh first." >&2
		exit 1
	}

	docker rm -f "$NAME" >/dev/null 2>&1 || true
	docker run -d --name "$NAME" --platform linux/amd64 -p "${PORT}:80" "$IMAGE" sleep infinity >/dev/null
	sleep 2

	docker exec "$NAME" sh -c 'mkdir -p /var/lock /var/run/ubus'
	docker cp "$THEME" "$NAME:/tmp/theme.ipk"
	docker cp "$CONFIG" "$NAME:/tmp/config.ipk"
	docker exec "$NAME" sh -c '
		opkg install /tmp/theme.ipk /tmp/config.ipk >/dev/null
		printf "root\nroot\n" | passwd root >/dev/null 2>&1 || true
	'

	docker exec -d "$NAME" ubusd -s /var/run/ubus/ubus.sock
	sleep 1
	docker exec -d "$NAME" procd -s /var/run/ubus/ubus.sock -S
	sleep 1
	docker exec -d "$NAME" rpcd -s /var/run/ubus/ubus.sock
	sleep 1
	docker exec -d "$NAME" uhttpd -f -p 0.0.0.0:80 -h /www -r OpenWrt \
		-x /cgi-bin -u /ubus -U /var/run/ubus/ubus.sock -a 0 \
		-t 60 -T 30 -k 20 -A 1 -n 3
	sleep 2

	echo "Echo ${VERSION} — OpenWrt 24.10 sandbox"
	echo "URL:    http://127.0.0.1:${PORT}/cgi-bin/luci/"
	echo "Login:  root / root"
	echo "Shell:  docker exec -it ${NAME} sh"
	echo "Stop:   $0 stop"
	curl -sS -o /dev/null -w "login page: %{http_code} (403 is expected)\n" \
		--max-time 10 "http://127.0.0.1:${PORT}/cgi-bin/luci/" || true
	curl -sS -o /dev/null -w "CSS asset:  %{http_code}\n" \
		--max-time 10 "http://127.0.0.1:${PORT}/luci-static/echo/css/echo.css" || true
	;;
stop)
	docker rm -f "$NAME" >/dev/null 2>&1 || true
	echo "Removed ${NAME}."
	;;
shell)
	docker exec -it "$NAME" sh
	;;
*)
	echo "Usage: $0 [start|stop|shell]" >&2
	exit 2
	;;
esac
