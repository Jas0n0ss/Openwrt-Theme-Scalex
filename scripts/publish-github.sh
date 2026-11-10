#!/usr/bin/env bash
# Create GitHub repo (if needed), push main, and trigger CI workflow.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! gh auth status >/dev/null 2>&1; then
	echo "GitHub CLI not authenticated. Run: gh auth login" >&2
	exit 1
fi

OWNER="$(gh api user -q .login)"
REPO="${1:-openwrt-theme-scalex}"

if ! gh repo view "${OWNER}/${REPO}" >/dev/null 2>&1; then
	echo "Creating ${OWNER}/${REPO} ..."
	gh repo create "$REPO" --public --description "ScaleX 3.0 - Apple-inspired Liquid Glass theme for OpenWrt LuCI"
fi

if git remote get-url origin >/dev/null 2>&1; then
	git remote set-url origin "git@github.com:${OWNER}/${REPO}.git"
else
	git remote add origin "git@github.com:${OWNER}/${REPO}.git"
fi

git push -u origin main

echo ""
echo "Repository: https://github.com/${OWNER}/${REPO}"
echo "CI:         https://github.com/${OWNER}/${REPO}/actions"
echo ""
echo "Triggering workflow_dispatch ..."
gh workflow run build.yml --ref main
echo "Done. Check Actions tab for build status."
