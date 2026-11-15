#!/usr/bin/env node
/**
 * scripts/release-check.mjs — the single home of the release rules used by
 * .github/workflows/publish.yml and .github/workflows/ci.yml. The workflows
 * only call this script; they carry no rule of their own.
 *
 * Why: run 35177528704 published from a tag (v2.0.0-rc.1) that disagreed with
 * the package versions, and `workspace:*` ranges must never reach the registry.
 *
 * Flags:
 *   --root <dir>    repo root to read packages/*\/package.json from (default: this repo)
 *   --tag <ref>     fail unless every package version equals the tag ("v2.3.0" or "2.3.0")
 *   --packed <dir>  instead check the *.tgz files `pnpm -r pack` wrote there: no
 *                   workspace: range in any dependency field of package/package.json
 *
 * Without --packed it also fails unless all packages share one version and the
 * public (non-private) set is exactly the five of ADR 005.
 */
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC = [
  "@tunnelmindai/fareseal-adapter-x402",
  "@tunnelmindai/fareseal-cloudflare",
  "@tunnelmindai/fareseal-core",
  "@tunnelmindai/fareseal-hono",
  "@tunnelmindai/fareseal-maze",
];
const FIELDS = [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
  "devDependencies",
];

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const v = argv[i + 1];
  // Fail closed: a bare flag must not silently skip its check.
  if (v === undefined || v.startsWith("--")) {
    console.error(`${name} needs a value`);
    process.exit(1);
  }
  return v;
};
const root = resolve(
  flag("--root") ?? resolve(dirname(fileURLToPath(import.meta.url)), ".."),
);
const tag = flag("--tag")?.replace(/^v/, "");
const packedDir = flag("--packed");

const errors = [];

if (packedDir) {
  const tgzs = readdirSync(packedDir).filter((f) => f.endsWith(".tgz"));
  if (tgzs.length === 0) errors.push(`${packedDir}: no .tgz files found`);
  for (const f of tgzs) {
    const file = join(packedDir, f);
    const r = spawnSync("tar", ["-xzOf", file, "package/package.json"], {
      encoding: "utf8",
    });
    if (r.status !== 0) {
      errors.push(
        `${file}: cannot read package/package.json (${r.stderr.trim()})`,
      );
      continue;
    }
    const manifest = JSON.parse(r.stdout);
    for (const field of FIELDS) {
      for (const [dep, range] of Object.entries(manifest[field] ?? {})) {
        if (String(range).startsWith("workspace:"))
          errors.push(`${file}: ${field}.${dep} is ${range}`);
      }
    }
  }
} else {
  const pkgs = readdirSync(join(root, "packages"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const path = join(root, "packages", d.name, "package.json");
      return { path, ...JSON.parse(readFileSync(path, "utf8")) };
    });
  const pub = pkgs
    .filter((p) => !p.private)
    .map((p) => p.name)
    .sort();
  if (pub.join() !== PUBLIC.join()) {
    errors.push(
      `public set is [${pub.join(", ")}], ADR 005 requires [${PUBLIC.join(", ")}]`,
    );
  }
  const first = pkgs[0]?.version;
  for (const p of pkgs) {
    if (p.version !== first)
      errors.push(`${p.path}: ${p.name} is ${p.version}, others are ${first}`);
    if (tag !== undefined && p.version !== tag)
      errors.push(`${p.path}: ${p.name} is ${p.version}, tag is ${tag}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    packedDir
      ? "release-check: packed manifests clean"
      : `release-check: ok (${tag ?? "no tag"})`,
  );
}
