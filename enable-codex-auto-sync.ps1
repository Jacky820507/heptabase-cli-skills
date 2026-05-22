$ErrorActionPreference = "Stop"

$RepoRoot = $PSScriptRoot
$HooksDir = Join-Path $RepoRoot ".githooks"
$InstallScript = Join-Path $RepoRoot "install-codex.ps1"

if (-not (Test-Path -LiteralPath $HooksDir)) {
    throw "Git hooks directory not found: $HooksDir"
}

if (-not (Test-Path -LiteralPath $InstallScript)) {
    throw "Install script not found: $InstallScript"
}

Set-Location -LiteralPath $RepoRoot
git config core.hooksPath .githooks

& $InstallScript

Write-Host "Codex auto-sync enabled for this clone."
Write-Host "Future git pull, checkout, and rebase operations will sync the skill into Codex."
