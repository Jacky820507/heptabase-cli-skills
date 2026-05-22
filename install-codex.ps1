param(
    [string]$SkillName = "heptabase-cli",
    [string]$CodexSkillsDir = (Join-Path $HOME ".codex\skills")
)

$ErrorActionPreference = "Stop"

$RepoRoot = $PSScriptRoot
$Source = Join-Path $RepoRoot "skills\$SkillName"
$Target = Join-Path $CodexSkillsDir $SkillName

if (-not (Test-Path -LiteralPath $Source)) {
    throw "Skill source not found: $Source"
}

if (-not (Test-Path -LiteralPath (Join-Path $Source "SKILL.md"))) {
    throw "SKILL.md not found under: $Source"
}

$ResolvedCodexSkillsDir = [System.IO.Path]::GetFullPath($CodexSkillsDir)
$ResolvedTarget = [System.IO.Path]::GetFullPath($Target)

if (-not $ResolvedTarget.StartsWith($ResolvedCodexSkillsDir, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to sync outside Codex skills directory: $ResolvedTarget"
}

New-Item -ItemType Directory -Force -Path $CodexSkillsDir | Out-Null

robocopy $Source $Target /MIR /XD ".git" /NFL /NDL /NJH /NJS /NP | Out-Null
$ExitCode = $LASTEXITCODE

if ($ExitCode -ge 8) {
    throw "robocopy failed with exit code $ExitCode"
}

Write-Host "Installed $SkillName to $Target"
