import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

const script = join(import.meta.dirname, "release-check.mjs");
const FIVE = ["core", "cloudflare", "hono", "maze", "adapter-x402"];
const PRIVATE = ["cli", "adapter-stripe"];

const tmp = () => mkdtempSync(join(tmpdir(), "release-check-"));
const run = (...args: string[]) =>
  spawnSync("node", [script, ...args], { encoding: "utf8" });

type Pkg = Record<string, unknown>;
/** A repo tree with packages/<dir>/package.json; `edit` tweaks one package before writing. */
function tree(
  version = "2.3.0",
  edit: (dir: string, pkg: Pkg) => Pkg = (_d, p) => p,
) {
  const root = tmp();
  for (const dir of [...FIVE, ...PRIVATE]) {
    const pkg: Pkg = { name: `@tunnelmindai/fareseal-${dir}`, version };
    if (PRIVATE.includes(dir)) pkg.private = true;
    mkdirSync(join(root, "packages", dir), { recursive: true });
    writeFileSync(
      join(root, "packages", dir, "package.json"),
      JSON.stringify(edit(dir, pkg)),
    );
  }
  return root;
}

/** A directory of .tgz files shaped like `pnpm -r pack` output. */
function packed(manifest: Pkg) {
  const out = tmp();
  const src = join(out, "src", "package");
  mkdirSync(src, { recursive: true });
  writeFileSync(
    join(src, "package.json"),
    JSON.stringify({ name: "x", version: "1.0.0", ...manifest }),
  );
  const dest = join(out, "tgz");
  mkdirSync(dest);
  spawnSync("tar", [
    "-czf",
    join(dest, "x-1.0.0.tgz"),
    "-C",
    join(out, "src"),
    "package",
  ]);
  return dest;
}

test("one version, no tag passes", () => {
  expect(run("--root", tree()).status).toBe(0);
});

test("rc tag against a 2.0.0 package fails naming file and both versions", () => {
  const r = run("--root", tree("2.0.0"), "--tag", "v2.0.0-rc.1");
  expect(r.status).toBe(1);
  expect(r.stderr).toContain("package.json");
  expect(r.stderr).toContain("2.0.0");
  expect(r.stderr).toContain("2.0.0-rc.1");
});

test("matching tag passes, bare version accepted", () => {
  expect(run("--root", tree(), "--tag", "v2.3.0").status).toBe(0);
  expect(run("--root", tree(), "--tag", "2.3.0").status).toBe(0);
});

test("a package with a different version fails naming it", () => {
  const root = tree("2.3.0", (d, p) =>
    d === "hono" ? { ...p, version: "2.2.0" } : p,
  );
  const r = run("--root", root);
  expect(r.status).toBe(1);
  expect(r.stderr).toContain("fareseal-hono");
});

test("public set other than the five fails", () => {
  const sixth = tree("2.3.0", (d, p) =>
    d === "cli" ? { ...p, private: undefined } : p,
  );
  const a = run("--root", sixth);
  expect(a.status).toBe(1);
  expect(a.stderr).toContain("ADR 005");
  const missing = tree("2.3.0", (d, p) =>
    d === "maze" ? { ...p, private: true } : p,
  );
  const b = run("--root", missing);
  expect(b.status).toBe(1);
  expect(b.stderr).toContain("ADR 005");
});

test("a flag with no value fails closed", () => {
  const r = run("--root", tree(), "--tag");
  expect(r.status).toBe(1);
  expect(r.stderr).toContain("--tag needs a value");
  expect(run("--tag", "--root", tree()).stderr).toContain(
    "--tag needs a value",
  );
});

for (const field of [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
  "devDependencies",
]) {
  test(`workspace:* in ${field} fails`, () => {
    const r = run(
      "--packed",
      packed({ [field]: { "@tunnelmindai/fareseal-core": "workspace:*" } }),
    );
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(field);
  });
}

test("clean packed tarballs pass", () => {
  expect(
    run(
      "--packed",
      packed({ dependencies: { "@tunnelmindai/fareseal-core": "^2.3.0" } }),
    ).status,
  ).toBe(0);
});
