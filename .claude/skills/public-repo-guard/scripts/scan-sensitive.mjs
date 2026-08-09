#!/usr/bin/env node

// Scans content headed for this PUBLIC repo for sensitive or internal data.
//
// Usage:
//   node scan-sensitive.mjs            # same as --staged
//   node scan-sensitive.mjs --staged   # scan lines ADDED by the staged diff + staged filenames
//   node scan-sensitive.mjs --all      # scan all tracked + untracked (not ignored) files
//   node scan-sensitive.mjs <paths...> # scan the given files fully
//
// Exit codes: 0 clean, 1 findings to judge, 2 usage/environment error.
//
// A finding is a question for a human/agent, not a verdict. Lines containing
// the marker "public-ok" are skipped so deliberate documentation examples can
// be allowed explicitly (justify the marker in the PR).

import { promises as fs } from "node:fs";
import { existsSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ALLOW_MARKER = /public-ok/i;

// Structural patterns only — no blocklist of internal names/domains, so this
// scanner itself stays safe to publish. "mask" hides the match in output so
// real secrets are not echoed into terminals or CI logs.
const CONTENT_RULES = [
  { category: "private-key", mask: true, re: /-----BEGIN [A-Z ]*PRIVATE KEY( BLOCK)?-----/ },
  { category: "aws-key", mask: true, re: /\bAKIA[0-9A-Z]{16}\b/ },
  { category: "github-token", mask: true, re: /\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/ },
  { category: "stripe-key", mask: true, re: /\b[srp]k_(live|test)_[A-Za-z0-9]{10,}\b/ },
  // OpenAI / Anthropic use sk-… (hyphen). Stripe above uses sk_live_ / sk_test_ (underscore).
  {
    category: "ai-api-key",
    mask: true,
    re: /\b(sk-proj-[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{32,})\b/,
  },
  { category: "slack-token", mask: true, re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { category: "jwt", mask: true, re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}/ },
  {
    category: "credential-assignment",
    mask: true,
    // Quoted values, or unquoted .env / YAML-style assignments (password=…, api_key: …).
    re: /(api[_-]?key|secret|token|passwd|password|authorization|bearer)["']?\s*[:=]\s*(?:["'][^"']{8,}["']|[^\s"'`={][^\s"'`]{7,})/i,
  },
  {
    category: "email",
    mask: false,
    re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/,
    allow: (match) =>
      /example\.(com|org|net)$/i.test(match) ||
      /^noreply@/i.test(match) ||
      /users\.noreply\.github\.com$/i.test(match) ||
      /^git@/i.test(match), // ssh clone URLs like git@github.com:org/repo.git
  },
  { category: "home-path", mask: false, re: /(\/(Users|home)\/[A-Za-z0-9._-]+|C:\\Users\\[A-Za-z0-9._-]+)/ },
  {
    category: "internal-workspace-url",
    mask: false,
    re: /(notion\.(so|com)\/|discord\.com\/channels\/|[a-z0-9-]+\.slack\.com|linear\.app\/|[a-z0-9-]+\.atlassian\.net|docs\.google\.com\/(document|spreadsheets)\/d\/|app\.datadoghq\.com\/|app\.intercom\.com\/)/i,
  },
  {
    category: "uuid",
    mask: false,
    re: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
    // Docs use repeated-single-digit placeholders (11111111-1111-4111-...);
    // those are synthetic by construction, unlike real workspace/card ids.
    allow: (match) => /^(.)\1{7}-\1{4}-[0-9a-f]\1{3}-[0-9a-f]\1{3}-\1{12}$/i.test(match),
  },
  {
    category: "ip-address",
    mask: false,
    re: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
    allow: (match) => {
      const octets = match.split(".").map(Number);
      // Skip non-IPs (e.g. version-ish 999.999.999.999) and common loopback/any broadcast.
      if (octets.some((octet) => octet > 255)) return true;
      return (
        match === "127.0.0.1" ||
        match === "0.0.0.0" ||
        match.startsWith("0.0.") ||
        match === "255.255.255.255"
      );
    },
  },
];

// Filename patterns for files that should essentially never enter this repo.
const FILENAME_RULES = [
  { category: "env-file", re: /^(\.env(?!\.(example|sample|template)$)(\..+)?|\.envrc)$/ },
  { category: "key-material-file", re: /\.(pem|key|p12|pfx)$/i },
  // Private key material only — allow committing id_rsa.pub / id_ed25519.pub.
  { category: "ssh-key-file", re: /^id_(rsa|ed25519|ecdsa|dsa)(?!\.pub$)(\..+)?$/ },
  { category: "credential-file", re: /^(credentials\.json|service-account.*\.json|\.npmrc|\.netrc)$/i },
  { category: "capture-or-log-file", re: /\.(har|log|sqlite|db)$/i },
];

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
const yellow = (text) => paint("33", text);
const cyan = (text) => paint("36", text);
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

const repoRoot = findRepoRoot();
const findings = [];
let allowedCount = 0;

function mask(text) {
  if (text.length <= 10) return `${text.slice(0, 3)}…`;
  return `${text.slice(0, 6)}…${text.slice(-2)} (${text.length} chars, masked)`;
}

function allMatches(re, text) {
  // Copy with /g so we walk every match. Skipping an allowed first hit must not
  // hide a later real secret on the same line (e.g. noreply@… next to a real email).
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  return text.matchAll(new RegExp(re.source, flags));
}

function scanLine(file, lineNumber, line) {
  const hasPublicOk = ALLOW_MARKER.test(line);
  let lineHadFinding = false;
  for (const rule of CONTENT_RULES) {
    for (const match of allMatches(rule.re, line)) {
      if (rule.allow?.(match[0])) continue;
      if (hasPublicOk) {
        lineHadFinding = true;
        continue;
      }
      findings.push({
        category: rule.category,
        location: `${file}:${lineNumber}`,
        snippet: rule.mask ? mask(match[0]) : match[0].slice(0, 100),
      });
    }
  }
  // Count only lines where public-ok actually suppressed a finding.
  if (hasPublicOk && lineHadFinding) allowedCount += 1;
}

function scanFileName(file) {
  const base = path.basename(file);
  for (const rule of FILENAME_RULES) {
    if (rule.re.test(base)) {
      findings.push({ category: rule.category, location: file, snippet: `suspicious filename: ${base}` });
    }
  }
}

function looksBinary(buffer) {
  return buffer.subarray(0, 8000).includes(0);
}

async function scanWholeFile(relFile) {
  scanFileName(relFile);
  const absolute = path.isAbsolute(relFile) ? relFile : path.join(repoRoot, relFile);
  let buffer;
  try {
    buffer = await fs.readFile(absolute);
  } catch {
    return; // deleted or unreadable; nothing to scan
  }
  if (looksBinary(buffer)) return;
  const lines = buffer.toString("utf8").split("\n");
  lines.forEach((line, index) => scanLine(relFile, index + 1, line));
}

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function scanStagedDiff() {
  const stagedFiles = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])
    .split("\n")
    .filter(Boolean);
  for (const file of stagedFiles) scanFileName(file);

  const diff = git(["diff", "--cached", "-U0", "--no-color"]);
  let currentFile = null;
  let lineNumber = 0;
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ b/")) {
      currentFile = raw.slice("+++ b/".length);
    } else if (raw.startsWith("@@")) {
      const hunk = /\+(\d+)/.exec(raw);
      lineNumber = hunk ? Number(hunk[1]) : 0;
    } else if (raw.startsWith("+") && currentFile) {
      scanLine(currentFile, lineNumber, raw.slice(1));
      lineNumber += 1;
    }
  }
  return stagedFiles.length;
}

const args = process.argv.slice(2);
const knownFlags = new Set(["--staged", "--all"]);
const flags = args.filter((arg) => arg.startsWith("--"));
const pathArgs = args.filter((arg) => !arg.startsWith("--"));
const unknownFlags = flags.filter((flag) => !knownFlags.has(flag));

function usageError(message) {
  console.error(`${red("❌")} ${message}`);
  console.error(dim("Usage: node scan-sensitive.mjs [--staged | --all | <paths...>]"));
  process.exit(2);
}

if (unknownFlags.length > 0) {
  usageError(`Unknown flag(s): ${unknownFlags.join(", ")}`);
}
if (flags.includes("--staged") && flags.includes("--all")) {
  usageError("Use only one of --staged or --all.");
}
if (pathArgs.length > 0 && flags.length > 0) {
  usageError("Pass either --staged/--all or file paths, not both.");
}

if (flags.includes("--all")) {
  const tracked = git(["ls-files"]).split("\n").filter(Boolean);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean);
  const files = [...new Set([...tracked, ...untracked])];
  for (const file of files) await scanWholeFile(file);
  report(`${files.length} tracked/untracked file(s)`);
} else if (pathArgs.length > 0) {
  for (const file of pathArgs) await scanWholeFile(file);
  report(`${pathArgs.length} given path(s)`);
} else {
  // Default mode, also selected explicitly via --staged.
  const stagedCount = scanStagedDiff();
  if (stagedCount === 0) {
    console.log(`${dim("ℹ️")}  Nothing staged; nothing to scan.`);
    process.exit(0);
  }
  report(`added lines across ${stagedCount} staged file(s)`);
}

function report(scopeDescription) {
  if (findings.length === 0) {
    const allowedNote =
      allowedCount > 0 ? dim(` (${allowedCount} line(s) allowed via public-ok marker)`) : "";
    console.log(`${green("✅")} Clean: no sensitive patterns in ${scopeDescription}.${allowedNote}`);
    process.exit(0);
  }
  const width = Math.max(...findings.map((entry) => entry.category.length));
  for (const entry of findings) {
    console.log(
      `${yellow("⚠️")}  ${yellow(entry.category.padEnd(width))}  ${cyan(entry.location)}  ${entry.snippet}`,
    );
  }
  console.log("");
  console.log(
    `${yellow("⚠️")}  ${bold(`${findings.length} finding(s)`)} in ${scopeDescription}. ` +
      "Judge each one: remove/replace real sensitive data, " +
      "or append a 'public-ok' marker to deliberate examples (and justify it in the PR).",
  );
  process.exit(1);
}
