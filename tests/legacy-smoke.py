#!/usr/bin/env python3
"""Smoke test for the Lua / LuCI 18.06 compatibility shell."""
from __future__ import annotations

import argparse
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ARTIFACTS = Path(__file__).resolve().parent / "artifacts"


def check(ok: bool, message: str) -> None:
    if not ok:
        raise AssertionError(message)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:9080/tests/fixtures/legacy.html")
    parser.add_argument("--engine", default=os.environ.get("PLAYWRIGHT_ENGINE", "chromium"),
                        choices=["chromium", "firefox", "webkit"])
    parser.add_argument("--channel", default=os.environ.get("PLAYWRIGHT_CHANNEL", ""))
    args = parser.parse_args()

    launch = {"headless": True}
    if args.engine == "chromium" and args.channel:
        launch["channel"] = args.channel

    ARTIFACTS.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = getattr(p, args.engine).launch(**launch)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        errors: list[str] = []
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        page.goto(args.base_url, wait_until="networkidle")
        page.wait_for_timeout(300)

        page.click(".nav-section.has-dropdown > .nav-top")
        page.wait_for_timeout(260)
        check(
            "open" in (page.locator(".nav-section.has-dropdown").first.get_attribute("class") or ""),
            "legacy dropdown did not open",
        )
        page.keyboard.press("Escape")

        page.click('[data-theme-mode="dark"]')
        page.wait_for_timeout(150)
        check(page.evaluate("document.documentElement.dataset.theme") == "dark", "legacy theme switch failed")
        page.click('[data-theme-mode="light"]')

        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(250)
        check(page.is_visible("#echo-menu-btn"), "legacy menu button hidden on mobile")
        page.click("#echo-menu-btn")
        page.wait_for_timeout(450)
        check(page.locator("#echo-sheet").count() == 1, "legacy sheet was not created")
        check("is-open" in (page.locator("#echo-sheet").get_attribute("class") or ""), "legacy sheet did not open")
        check(page.evaluate("document.activeElement.className") == "echo-sheet-close", "legacy sheet focus missing")
        page.screenshot(path=str(ARTIFACTS / "legacy-sheet.png"), full_page=False)
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)
        check(page.locator("#echo-sheet").get_attribute("hidden") is not None, "legacy sheet did not close")
        check(not errors, f"legacy page errors: {errors[:3]}")
        browser.close()

    print(f"PASS [legacy/{args.engine}]")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"FAIL: {exc}")
        raise SystemExit(1)
