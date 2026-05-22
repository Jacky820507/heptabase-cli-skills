param(
    [string]$Message = "Update Heptabase CLI skill",
    [switch]$SkipPull
)

$ErrorActionPreference = "Stop"

$RepoRoot = $PSScriptRoot
Set-Location -LiteralPath $RepoRoot

if (-not $SkipPull) {
    git pull --ff-only origin main
}

git add skills install-codex.ps1 sync-github.ps1 README.md

$Status = git status --porcelain
if (-not $Status) {
    Write-Host "No changes to sync."
    exit 0
}

git status --short
git commit -m $Message
git push origin main

Write-Host "Synced changes to origin/main."
