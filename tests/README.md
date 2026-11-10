# ScaleX UI tests

## Demo smoke tests

```sh
./demo/serve.sh &
python3 -m venv .venv
.venv/bin/pip install -r tests/requirements.txt

.venv/bin/python tests/ui-smoke.py --base-url http://127.0.0.1:9080/demo/ --channel chrome
.venv/bin/python tests/ui-smoke.py --base-url http://127.0.0.1:9080/demo/ --engine webkit
.venv/bin/python tests/ui-smoke.py --base-url http://127.0.0.1:9080/demo/ --engine firefox
.venv/bin/python tests/legacy-smoke.py --base-url http://127.0.0.1:9080/tests/fixtures/legacy.html
```

`ui-smoke.py` checks:

- no horizontal overflow at 320, 360, 390, 768, 980, 1024, 1280, 1440px
- desktop top nav / L2 menu, appearance switch, mobile sheet open/close/focus
- sign-in primary button uses the accent color
- no uncaught page errors

`legacy-smoke.py` checks the Lua/18.06 server-rendered shell fixture:
top nav, L2 hover menu, theme switch, mobile sheet and focus.

Screenshots are written to `tests/artifacts/`.

## Real OpenWrt userland

`tests/real-router.sh` installs the built IPKs into an OpenWrt 24.10
x86_64 rootfs running under Docker/QEMU, starts `ubusd`, `procd`, `rpcd`
and `uhttpd`, and exposes LuCI on port 18080.

```sh
./scripts/build-ipk.sh
./tests/real-router.sh start
# http://127.0.0.1:18080/cgi-bin/luci/  root / root
./tests/real-router.sh stop
```

This is real OpenWrt userland, not a physical router. Under QEMU the
`rpcd` session backend can be slow; the first login is the reliable one.
