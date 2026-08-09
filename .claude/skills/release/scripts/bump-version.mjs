#!/usr/bin/env node

// Bumps the plugin version in the two manifests that must stay in sync:
//   .claude-plugin/plugin.json  (source of truth for Claude Code)
//   .cursor-plugin/plugin.json  (must mirror it for Cursor)
//
// Usage: node bump-version.mjs <patch|minor|major|X.Y.Z> [--dry-run]
//
// Refuses to run when the manifests disagree, when the target version does
// not advance past the current one, or when a manifest does not contain
// exactly one `"version": "…"` needle. Prepares both updates first, writes
// both, then re-reads to verify they agree on the new version. Rewrites only
// the version line so the rest of each file's formatting is preserved.

import { promises as fs } from "node:fs";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MANIFESTS = [".claude-plugin/plugin.json", ".cursor-plugin/plugin.json"];
const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;

function fail(message) {
  console.error(JSON.stringify({ error: message }, null, 2));
  process.exit(1);
}

// Resolve the repo root from this script's real location (works through the
// skill-sync symlinks and regardless of the caller's working directory).
function findRepoRoot() {
  let dir = path.dirname(realpathSync(fileURLToPath(import.meta.url)));
  while (true) {
    if (existsSync(path.join(dir, ".claude-plugin", "plugin.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) {
      fail("Could not locate the repo root (no .claude-plugin/plugin.json above the script).");
    }
    dir = parent;
  }
}

function parseSemver(value) {
  const match = SEMVER_RE.exec(value);
  return match ? match.slice(1).map(Number) : null;
}

function compareSemver(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function replaceVersionExactly(raw, currentVersion, nextVersion, relPath) {
  const needle = `"version": "${currentVersion}"`;
  const replacement = `"version": "${nextVersion}"`;
  const occurrences = raw.split(needle).length - 1;
  if (occurrences === 0) {
    fail(`Could not find ${needle} in ${relPath}; refusing to write.`);
  }
  if (occurrences > 1) {
    fail(`Found ${occurrences} occurrences of ${needle} in ${relPath}; refusing to write.`);
  }
  return raw.replace(needle, replacement);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const bumpArg = args.find((arg) => !arg.startsWith("--"));
if (!bumpArg) {
  fail("Usage: node bump-version.mjs <patch|minor|major|X.Y.Z> [--dry-run]");
}

const repoRoot = findRepoRoot();

const manifests = [];
for (const relPath of MANIFESTS) {
  const filePath = path.join(repoRoot, relPath);
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    fail(`Manifest is missing: ${relPath}`);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    fail(`Manifest contains invalid JSON (${relPath}): ${error.message}`);
  }
  if (typeof data.version !== "string") {
    fail(`Manifest has no string "version" field: ${relPath}`);
  }
  manifests.push({ relPath, filePath, raw, version: data.version });
}

const [claudeManifest, cursorManifest] = manifests;
if (claudeManifest.version !== cursorManifest.version) {
  fail(
    `Manifests are out of sync: ${claudeManifest.relPath} has ${claudeManifest.version}, ` +
      `${cursorManifest.relPath} has ${cursorManifest.version}. Fix the mismatch first.`,
  );
}

const current = parseSemver(claudeManifest.version);
if (!current) {
  fail(`Current version "${claudeManifest.version}" is not plain X.Y.Z semver.`);
}

let next;
if (bumpArg === "major") {
  next = [current[0] + 1, 0, 0];
} else if (bumpArg === "minor") {
  next = [current[0], current[1] + 1, 0];
} else if (bumpArg === "patch") {
  next = [current[0], current[1], current[2] + 1];
} else {
  next = parseSemver(bumpArg);
  if (!next) {
    fail(`"${bumpArg}" is neither patch/minor/major nor a valid X.Y.Z version.`);
  }
  if (compareSemver(next, current) <= 0) {
    fail(`Target version ${bumpArg} does not advance past the current ${claudeManifest.version}.`);
  }
}

const nextVersion = next.join(".");

// Prepare both replacements before writing either file.
const updates = manifests.map((manifest) => ({
  ...manifest,
  updated: replaceVersionExactly(manifest.raw, manifest.version, nextVersion, manifest.relPath),
}));

if (!dryRun) {
  for (const update of updates) {
    await fs.writeFile(update.filePath, update.updated, "utf8");
  }

  // Re-read both manifests and confirm they agree on the new version.
  for (const update of updates) {
    let written;
    try {
      written = JSON.parse(await fs.readFile(update.filePath, "utf8"));
    } catch (error) {
      fail(
        `Wrote ${update.relPath} but could not re-read/parse it (${error.message}). ` +
          "Manifests may be out of sync; fix them before releasing.",
      );
    }
    if (written.version !== nextVersion) {
      fail(
        `Wrote ${update.relPath} but it now has version "${written.version}" instead of "${nextVersion}". ` +
          "Manifests may be out of sync; fix them before releasing.",
      );
    }
  }
}

console.log(
  JSON.stringify(
    {
      previousVersion: claudeManifest.version,
      newVersion: nextVersion,
      dryRun,
      updatedFiles: MANIFESTS,
    },
    null,
    2,
  ),
);
