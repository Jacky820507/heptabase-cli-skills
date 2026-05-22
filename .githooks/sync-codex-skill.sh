#!/bin/sh

set -eu

REPO_ROOT="$(git rev-parse --show-toplevel)"
SCRIPT_PATH="$REPO_ROOT/install-codex.ps1"

if command -v cygpath >/dev/null 2>&1; then
    SCRIPT_PATH="$(cygpath -w "$SCRIPT_PATH")"
fi

if command -v pwsh.exe >/dev/null 2>&1; then
    pwsh.exe -NoProfile -ExecutionPolicy Bypass -File "$SCRIPT_PATH"
else
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$SCRIPT_PATH"
fi
