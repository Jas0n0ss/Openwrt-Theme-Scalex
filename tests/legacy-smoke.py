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
        page.goto(args.base_url, wait_until="load")
        page.wait_for_timeout(300)

        check(page.is_visible("#scalex-sidebar"), "legacy sidebar is hidden")
        check(
            page.locator(".sidebar-section.is-active .sidebar-subitem").count() >= 1,
            "legacy active section has no subitems",
        )
        page.fill("#scalex-nav-search", "network")
        page.wait_for_timeout(150)
        check(
            page.locator("#top-nav .sidebar-section:visible").count() <= 2,
            "legacy sidebar search did not filter",
        )
        page.fill("#scalex-nav-search", "")

        page.click('[data-theme-mode="dark"]')
        page.wait_for_timeout(150)
        check(page.evaluate("document.documentElement.dataset.theme") == "dark", "legacy theme switch failed")
        page.click('[data-theme-mode="light"]')

        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(250)
        check(page.is_visible("#scalex-tabbar"), "legacy tab bar hidden on mobile")
        check(page.is_visible("#scalex-more-btn"), "legacy More tab missing")
        page.click("#scalex-more-btn")
        page.wait_for_timeout(450)
        check(page.locator("#scalex-sheet").count() == 1, "legacy sheet was not created")
        check("is-open" in (page.locator("#scalex-sheet").get_attribute("class") or ""), "legacy sheet did not open")
        check(page.evaluate("document.activeElement.className") == "scalex-sheet-close", "legacy sheet focus missing")
        page.screenshot(path=str(ARTIFACTS / "legacy-sheet.png"), full_page=False)
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)
        check(page.locator("#scalex-sheet").get_attribute("hidden") is not None, "legacy sheet did not close")
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
