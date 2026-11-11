#!/usr/bin/env python3
"""ScaleX 5.0 browser smoke test.

Run against the static demo:
    python tests/ui-smoke.py --base-url http://127.0.0.1:9080/demo/ --channel chrome

The script intentionally has no pytest dependency so it can run on a router
build machine or in a lightweight CI container.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

WIDTHS = [320, 360, 390, 768, 980, 1024, 1280, 1440]
ARTIFACTS = Path(__file__).resolve().parent / "artifacts"


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def new_page(browser, width: int, height: int, theme: str = "light"):
    context = browser.new_context(
        viewport={"width": width, "height": height},
        device_scale_factor=1,
        color_scheme="light",
    )
    page = context.new_page()
    page.add_init_script(
        "localStorage.setItem('scalex-theme', %s)" % json.dumps(theme)
    )
    errors: list[str] = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.on(
        "console",
        lambda msg: errors.append(msg.text)
        if msg.type == "error" and "Failed to load resource" not in msg.text
        else None,
    )
    return context, page, errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:9080/demo/")
    parser.add_argument(
        "--engine",
        default=os.environ.get("PLAYWRIGHT_ENGINE", "chromium"),
        choices=["chromium", "firefox", "webkit"],
        help="Browser engine to test (default: chromium)",
    )
    parser.add_argument(
        "--channel",
        default=os.environ.get("PLAYWRIGHT_CHANNEL", ""),
        help="Optional Playwright browser channel, e.g. chrome",
    )
    args = parser.parse_args()

    base = args.base_url.rstrip("/") + "/"
    clean = base + "?clean=1"
    ARTIFACTS.mkdir(parents=True, exist_ok=True)

    launch = {"headless": True}
    if args.engine == "chromium" and args.channel:
        launch["channel"] = args.channel

    with sync_playwright() as p:
        browser = getattr(p, args.engine).launch(**launch)

        # 1. Responsive geometry
        for width in WIDTHS:
            context, page, errors = new_page(browser, width, 900)
            page.goto(clean, wait_until="load")
            page.wait_for_timeout(200)
            dims = page.evaluate(
                "() => ({sw: document.documentElement.scrollWidth,"
                " cw: document.documentElement.clientWidth})"
            )
            check(
                dims["sw"] <= dims["cw"],
                f"{width}px: horizontal overflow ({dims['sw']} > {dims['cw']})",
            )
            check(not errors, f"{width}px: page errors: {errors[:3]}")
            context.close()

        # 2. Desktop interactions
        context, page, errors = new_page(browser, 1440, 1000)
        page.goto(base, wait_until="load")
        check(page.is_visible("#scalex-topbar"), "desktop top bar is hidden")
        check(
            page.locator("#top-nav .top-nav-section").count() >= 5,
            "top navigation is incomplete",
        )
        page.hover("#top-nav .top-nav-section.is-active")
        page.wait_for_timeout(180)
        check(
            page.locator("#top-nav .top-nav-section.is-active .top-nav-menu").is_visible(),
            "desktop L2 menu did not open",
        )
        page.click('[data-theme-mode="dark"]')
        page.wait_for_timeout(120)
        check(page.evaluate("document.documentElement.dataset.theme") == "dark", "dark mode not applied")
        check(
            page.evaluate("getComputedStyle(document.body).backgroundColor") == "rgb(8, 8, 10)",
            "dark canvas is not ink black",
        )
        page.click('[data-theme-mode="light"]')
        page.wait_for_timeout(120)
        check(page.evaluate("document.documentElement.dataset.theme") == "light", "light mode not applied")
        page.goto(clean, wait_until="load")
        page.wait_for_timeout(300)

        # WAN / LAN links must lead the overview
        wan = page.locator("#demo-wan-card")
        lan = page.locator("#demo-lan-card")
        check(wan.is_visible() and lan.is_visible(), "WAN / LAN link cards are missing")
        wan_box = wan.bounding_box()
        lan_box = lan.bounding_box()
        vitals_box = page.locator(".scalex-vitals").bounding_box()
        check(
            wan_box and lan_box and vitals_box and wan_box["y"] < vitals_box["y"],
            "WAN / LAN cards are not above the vitals",
        )
        check(
            wan_box["y"] < 900,
            "WAN card is not in the first screen",
        )
        check(
            page.locator("#demo-wan-card .scalex-link-state").inner_text().strip() == "UP",
            "WAN state text is missing",
        )
        check(
            page.locator("#demo-wan-card .scalex-link-facts .scalex-fact").count() >= 4,
            "WAN card facts are incomplete",
        )

        page.screenshot(path=str(ARTIFACTS / "desktop-light.png"), full_page=True)
        page.click('[data-theme-mode="dark"]')
        page.wait_for_timeout(200)
        page.screenshot(path=str(ARTIFACTS / "desktop-dark.png"), full_page=True)
        check(not errors, f"desktop page errors: {errors[:3]}")
        context.close()

        # 3. Mobile sheet
        context, page, errors = new_page(browser, 390, 844)
        page.goto(clean, wait_until="load")
        check(page.is_visible("#scalex-menu-btn"), "mobile menu button is hidden")
        check(not page.is_visible("#top-nav"), "desktop top navigation should be hidden on mobile")
        check(
            page.locator("#demo-wan-card").bounding_box()["width"] <= 390,
            "mobile WAN card overflows the viewport",
        )
        check(
            page.locator("#demo-lan-card").bounding_box()["y"]
            > page.locator("#demo-wan-card").bounding_box()["y"],
            "mobile LAN card is not stacked under WAN",
        )
        page.click("#scalex-menu-btn")
        page.wait_for_timeout(450)
        check("is-open" in (page.locator("#scalex-sheet").get_attribute("class") or ""), "sheet did not open")
        check(
            page.evaluate("document.activeElement && document.activeElement.id") == "scalex-sheet-close",
            "focus did not move into the sheet",
        )
        page.screenshot(path=str(ARTIFACTS / "mobile-sheet.png"), full_page=False)
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)
        check(page.locator("#scalex-sheet").get_attribute("hidden") is not None, "sheet did not close on Escape")
        page.evaluate("document.activeElement && document.activeElement.blur()")
        page.screenshot(path=str(ARTIFACTS / "mobile-light.png"), full_page=False)
        check(not errors, f"mobile page errors: {errors[:3]}")
        context.close()

        # 4. Sign-in accent and settings
        context, page, errors = new_page(browser, 1440, 1000)
        page.goto(base, wait_until="load")
        page.click('[data-view="login"]')
        page.wait_for_timeout(250)
        button_bg = page.eval_on_selector(
            "#demo-login-btn", "el => getComputedStyle(el).backgroundColor"
        )
        check(button_bg == "rgb(10, 143, 77)", f"login button is not signal green: {button_bg}")
        check(page.is_visible("#view-login .theme-switch"), "login appearance switch is hidden")
        page.click('#view-login [data-theme-mode="dark"]')
        page.wait_for_timeout(150)
        check(
            page.evaluate("getComputedStyle(document.body).backgroundColor") == "rgb(8, 8, 10)",
            "login dark mode did not apply",
        )
        page.click('#view-login [data-theme-mode="light"]')
        page.wait_for_timeout(150)
        page.evaluate("document.body.classList.add('demo-clean-view')")
        page.screenshot(path=str(ARTIFACTS / "login.png"), full_page=True)
        page.evaluate("document.body.classList.remove('demo-clean-view')")
        page.click('[data-view="settings"]')
        page.wait_for_timeout(250)
        page.evaluate("document.body.classList.add('demo-clean-view')")
        page.screenshot(path=str(ARTIFACTS / "settings.png"), full_page=True)
        check(not errors, f"sign-in page errors: {errors[:3]}")
        context.close()

        browser.close()

    print(f"PASS [{args.engine}] — {len(WIDTHS)} widths, desktop, mobile sheet, sign-in, settings")
    print(f"Screenshots: {ARTIFACTS}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
