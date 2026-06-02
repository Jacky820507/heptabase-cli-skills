#!/usr/bin/env node

// Validates the Cursor plugin manifest (.cursor-plugin/plugin.json) and its
// referenced components for this single-plugin repository. Mirrors the checks
// used by the official Cursor plugin template
// (https://github.com/cursor/plugin-template) and the published manifest schema
// (https://cursor.com/schemas/cursor-plugin/plugin.json).

import { promises as fs } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const errors = [];

const cursorPluginSchemaUrl =
  "https://raw.githubusercontent.com/cursor/plugins/main/schemas/plugin.schema.json";

function addError(message) {
  errors.push(message);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath, context) {
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    addError(`${context} is missing: ${filePath}`);
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    addError(`${context} contains invalid JSON (${filePath}): ${error.message}`);
    return undefined;
  }
}

async function downloadCursorPluginSchema(schemaPath) {
  const response = await fetch(cursorPluginSchemaUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Cursor plugin schema from ${cursorPluginSchemaUrl}: ${response.status} ${response.statusText}`,
    );
  }

  await fs.writeFile(schemaPath, await response.text(), "utf8");
}

function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return null;
  }

  const closingIndex = normalized.indexOf("\n---\n", 4);
  if (closingIndex === -1) {
    return null;
  }

  const frontmatterBlock = normalized.slice(4, closingIndex);
  const fields = {};

  for (const line of frontmatterBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    fields[key] = value;
  }

  return fields;
}

async function walkFiles(dirPath) {
  const files = [];
  const stack = [dirPath];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }

  return files;
}

function isSafeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return true;
  }
  if (path.isAbsolute(value)) {
    return false;
  }
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  return !normalized.startsWith("../") && normalized !== "..";
}

function extractPathValues(value) {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractPathValues(entry));
  }
  if (value && typeof value === "object") {
    const candidates = [];
    if (typeof value.path === "string") {
      candidates.push(value.path);
    }
    if (typeof value.file === "string") {
      candidates.push(value.file);
    }
    return candidates;
  }
  return [];
}

async function validateReferencedPath(fieldName, pathValue) {
  if (pathValue.startsWith("http://") || pathValue.startsWith("https://")) {
    return;
  }
  if (!isSafeRelativePath(pathValue)) {
    addError(
      `Field "${fieldName}" has invalid path "${pathValue}". Use a relative path without ".." or absolute prefixes.`,
    );
    return;
  }
  const resolved = path.resolve(repoRoot, pathValue);
  if (!(await pathExists(resolved))) {
    addError(`Field "${fieldName}" references missing path "${pathValue}".`);
  }
}

async function validateFrontmatterFile(filePath, componentName, requiredKeys) {
  const content = await fs.readFile(filePath, "utf8");
  const parsed = parseFrontmatter(content);
  const relativeFile = path.relative(repoRoot, filePath);

  if (!parsed) {
    addError(`${componentName} file missing YAML frontmatter: ${relativeFile}`);
    return;
  }

  for (const key of requiredKeys) {
    if (!parsed[key] || parsed[key].length === 0) {
      addError(`${componentName} file missing "${key}" in frontmatter: ${relativeFile}`);
    }
  }
}

async function validateComponentFrontmatter() {
  const componentDirs = [
    {
      dir: "rules",
      name: "rule",
      keys: ["description"],
      extensions: [".md", ".mdc", ".markdown"],
    },
    {
      dir: "agents",
      name: "agent",
      keys: ["name", "description"],
      extensions: [".md", ".mdc", ".markdown"],
    },
    {
      dir: "commands",
      name: "command",
      keys: ["name", "description"],
      extensions: [".md", ".mdc", ".markdown", ".txt"],
    },
  ];

  for (const { dir, name, keys, extensions } of componentDirs) {
    const absoluteDir = path.join(repoRoot, dir);
    if (!(await pathExists(absoluteDir))) {
      continue;
    }
    const files = await walkFiles(absoluteDir);
    for (const file of files) {
      if (extensions.includes(path.extname(file).toLowerCase())) {
        await validateFrontmatterFile(file, name, keys);
      }
    }
  }

  const skillsDir = path.join(repoRoot, "skills");
  if (await pathExists(skillsDir)) {
    const files = await walkFiles(skillsDir);
    for (const file of files) {
      if (path.basename(file) === "SKILL.md") {
        await validateFrontmatterFile(file, "skill", ["name", "description"]);
      }
    }
  }
}

async function validateManifestWithAjv({ manifestPath }) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cursor-plugin-schema-"));
  const schemaPath = path.join(tempDir, "plugin.schema.json");

  try {
    await downloadCursorPluginSchema(schemaPath);
    execFileSync(
      "npx",
      [
        "--yes",
        "--loglevel",
        "error",
        "--package",
        "ajv-cli",
        "--package",
        "ajv-formats",
        "ajv",
        "validate",
        "-c",
        "ajv-formats",
        "-s",
        schemaPath,
        "-d",
        manifestPath,
      ],
      {
        cwd: repoRoot,
        stdio: "inherit",
      },
    );
    return true;
  } catch (error) {
    addError(`Cursor plugin schema validation failed: ${error.message}`);
    return false;
  } finally {
    await fs.rm(tempDir, { force: true, recursive: true });
  }
}

function validateManifestVersionsAreSynced({ cursorManifest, claudeManifest }) {
  if (cursorManifest.version !== claudeManifest.version) {
    addError(
      `.cursor-plugin/plugin.json version (${cursorManifest.version}) must match .claude-plugin/plugin.json version (${claudeManifest.version}).`,
    );
  }
}

async function main() {
  const cursorManifestPath = path.join(repoRoot, ".cursor-plugin", "plugin.json");
  if (!(await validateManifestWithAjv({ manifestPath: cursorManifestPath }))) {
    summarizeAndExit();
    return;
  }

  const cursorManifest = await readJsonFile(cursorManifestPath, "Cursor plugin manifest");
  if (cursorManifest === undefined) {
    summarizeAndExit();
    return;
  }

  const claudeManifestPath = path.join(repoRoot, ".claude-plugin", "plugin.json");
  const claudeManifest = await readJsonFile(claudeManifestPath, "Claude plugin manifest");
  if (claudeManifest === undefined) {
    summarizeAndExit();
    return;
  }

  validateManifestVersionsAreSynced({ cursorManifest, claudeManifest });

  const manifestPathFields = [
    "logo",
    "rules",
    "skills",
    "agents",
    "commands",
    "hooks",
    "mcpServers",
  ];
  for (const field of manifestPathFields) {
    for (const value of extractPathValues(cursorManifest[field])) {
      await validateReferencedPath(field, value);
    }
  }

  await validateComponentFrontmatter();

  summarizeAndExit();
}

function summarizeAndExit() {
  if (errors.length > 0) {
    console.error("\x1b[31mCursor plugin validation failed:\x1b[0m");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("\x1b[32mCursor plugin validation passed!\x1b[0m");
}

await main();
