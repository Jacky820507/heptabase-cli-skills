#!/usr/bin/env node

// Installs a git pre-commit hook that runs the public-repo-guard staged scan
// before every commit in this clone. Hooks live in .git/ and are never
// committed, so each contributor runs this once per clone.
//
// Usage: node install-git-hook.mjs
//
// Idempotent: reinstalls over a previous version of itself. Refuses to touch
// a pre-commit hook it does not own (merge manually in that case).

import { promises as fs } from "node:fs";
import { existsSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MARKER = "public-repo-guard";

const HOOK_CONTENT = `#!/bin/sh
# ${MARKER} pre-commit hook — scans staged changes for sensitive/internal data.
# Installed by .claude/skills/public-repo-guard/scripts/install-git-hook.mjs
# Bypass for a justified false positive: git commit --no-verify (explain in the PR).
exec node .claude/skills/public-repo-guard/scripts/scan-sensitive.mjs --staged
`;

const useColor = (() => {
  if (process.env.FORCE_COLOR === "0") return false;
  if (process.env.FORCE_COLOR) return true;
  if (process.env.NO_COLOR) return false;
  return Boolean(process.stdout.isTTY || process.stderr.isTTY);
})();

function paint(code, text) {
  if (!useColor) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

const green = (text) => paint("32", text);
const red = (text) => paint("31", text);
const dim = (text) => paint("2", text);
const bold = (text) => paint("1", text);

function findRepoRoot() {
  let dir = path.dirname(realpathSync(fileURLToPath(import.meta.url)));
  while (true) {
    if (existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) {
      console.error(`${red("❌")} Could not locate a .git directory above this script.`);
      process.exit(2);
    }
    dir = parent;
  }
}

function resolveHookPath(repoRoot) {
  // Use git's path resolver so worktrees (where .git is a file) and
  // non-standard git dirs still land on the real hooks/pre-commit path.
  let gitPath;
  try {
    gitPath = execFileSync("git", ["rev-parse", "--git-path", "hooks/pre-commit"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    console.error(`${red("❌")} Could not resolve hooks/pre-commit via git rev-parse.`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
  return path.isAbsolute(gitPath) ? gitPath : path.join(repoRoot, gitPath);
}

const repoRoot = findRepoRoot();
const hookPath = resolveHookPath(repoRoot);

if (existsSync(hookPath)) {
  const existing = await fs.readFile(hookPath, "utf8");
  if (!existing.includes(MARKER)) {
    console.error(
      `${red("❌")} A pre-commit hook already exists at ${bold(hookPath)} and was not installed by ${MARKER}.\n` +
        "Merge manually: add this line to it:\n" +
        dim("  node .claude/skills/public-repo-guard/scripts/scan-sensitive.mjs --staged || exit 1"),
    );
    process.exit(1);
  }
}

await fs.mkdir(path.dirname(hookPath), { recursive: true });
await fs.writeFile(hookPath, HOOK_CONTENT, { mode: 0o755 });
// writeFile's mode only applies to newly created files — force +x on reinstall.
await fs.chmod(hookPath, 0o755);
const displayPath = path.relative(repoRoot, hookPath) || hookPath;
console.log(`${green("✅")} Installed pre-commit hook: ${bold(displayPath)}`);
console.log(dim("   Every git commit in this clone now runs the staged sensitive-data scan."));
console.log(dim(`   Remove with: rm ${displayPath}`));
