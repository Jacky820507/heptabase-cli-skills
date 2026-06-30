param(
    [string[]]$SkillName = @(),
    [string]$CodexSkillsDir = (Join-Path $HOME ".codex\skills")
)

$ErrorActionPreference = "Stop"

$RepoRoot = $PSScriptRoot
$SkillsRoot = Join-Path $RepoRoot "skills"

if (-not (Test-Path -LiteralPath $SkillsRoot)) {
    throw "Skills directory not found: $SkillsRoot"
}

if ($SkillName.Count -eq 0) {
    $SkillName = Get-ChildItem -LiteralPath $SkillsRoot -Directory |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "SKILL.md") } |
        Select-Object -ExpandProperty Name
}

if ($SkillName.Count -eq 0) {
    throw "No skills found under: $SkillsRoot"
}

$ResolvedCodexSkillsDir = [System.IO.Path]::GetFullPath($CodexSkillsDir)
$ResolvedCodexSkillsRoot = $ResolvedCodexSkillsDir.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

New-Item -ItemType Directory -Force -Path $CodexSkillsDir | Out-Null

foreach ($Name in $SkillName) {
    if ($Name -match '[\\/]') {
        throw "Skill name must be a directory name, not a path: $Name"
    }

    $Source = Join-Path $SkillsRoot $Name
    $Target = Join-Path $CodexSkillsDir $Name

    if (-not (Test-Path -LiteralPath $Source)) {
        throw "Skill source not found: $Source"
    }

    if (-not (Test-Path -LiteralPath (Join-Path $Source "SKILL.md"))) {
        throw "SKILL.md not found under: $Source"
    }

    $ResolvedTarget = [System.IO.Path]::GetFullPath($Target)

    if (-not $ResolvedTarget.StartsWith($ResolvedCodexSkillsRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to sync outside Codex skills directory: $ResolvedTarget"
    }

    robocopy $Source $Target /MIR /XD ".git" /NFL /NDL /NJH /NJS /NP | Out-Null
    $ExitCode = $LASTEXITCODE

    if ($ExitCode -ge 8) {
        throw "robocopy failed for $Name with exit code $ExitCode"
    }

    Write-Host "Installed $Name to $Target"
}