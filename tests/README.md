# Echo UI smoke test

Requires a running demo server and Playwright.

```sh
./demo/serve.sh &
python3 -m venv .venv
.venv/bin/pip install -r tests/requirements.txt
.venv/bin/python tests/ui-smoke.py \
  --base-url http://127.0.0.1:9080/demo/ \
  --channel chrome
```

The test checks:

- no horizontal overflow at 320, 360, 390, 768, 980, 1024, 1280, 1440px
- desktop L2 dropdown, appearance switch, mobile sheet open/close/focus
- sign-in primary button uses the accent color
- no uncaught page errors

Screenshots are written to `tests/artifacts/`.
