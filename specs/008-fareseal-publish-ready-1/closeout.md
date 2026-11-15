# Closeout — 008 fareseal-publish-ready-1

Nothing is published, tagged or bumped by this branch. Every `packages/*/package.json` is untouched (all seven already `2.3.0`).

## What changed

Source: `git diff main --stat` and `git log main..HEAD` (7 commits: spec, GATE 0, T001–T005 work). Cites checked by reading the files.

- `docs/release/first-npm-release.md` (new, 235 lines; DOC): Q1 the version question at `:7`; per-package semver at `:15`; the pick (default 2.3.0) at `:40`; T001 verify record at `:70`; CHANGELOG note at `:78-82`; owner's manual first publish procedure, steps 1–9, at `:97-207`; why the rc.1 tag run failed and the fix at `:209-219`; local dry-run record at `:221`.
- `packages/cloudflare/CHANGELOG.md:5`: heading only, `## 2.3.0 — Unreleased` → `## 2.3.0 — first npm release (date set by the bump commit)`. Lines below it are unchanged.
- `scripts/release-check.mjs` (new, 114 lines): the single home of the release rules. Public set is exactly the five of ADR 005 (`:24-30`), one shared version, `--tag`, `--packed` (no `workspace:` range in packed tarballs); a flag with no value fails closed. Flags documented at `:10-17`.
- `scripts/release-check.test.ts` (new, 128 lines): 11 tests, run the script against temp fixture trees.
- `vitest.config.ts:5-9`: `include` gains `scripts/**/*.test.ts`.
- `tsconfig.tests.json:16`: `"scripts"` added to `include`.
- `.github/workflows/publish.yml:53-59`: the inline tag check is replaced by `node scripts/release-check.mjs --tag "$GITHUB_REF_NAME"` (tags only) and a pack + `--packed` check; `:68-69` is the one publish step, `--dry-run` appended only for `workflow_dispatch` with `inputs.dry_run`.
- `.github/workflows/ci.yml:29-55`: new job `publish-dry-run` (`:31`; `contents: read`, no secrets, no `id-token`): install, build, test, `release-check.mjs`, pack + `--packed`, `pnpm -r publish --access public --no-git-checks --dry-run`.
- `specs/008-fareseal-publish-ready-1/{spec,plan,tasks}.md`: the spec itself (supervisor-owned, not edited here).
- This task adds `closeout.md` and `pr-body.md` in the spec directory.

## T003 red → green

Red: commit b8899da's message does not keep the red output, and the QA note says the coder's report did not repeat it, so I reproduced it. In a scratch copy (`crew-scratch`) with `scripts/release-check.mjs` deleted, `pnpm exec vitest run scripts/release-check.test.ts` gave:

```
 Test Files  1 failed (1)
      Tests  11 failed (11)
```

Green: on this tree, same command:

```
 Test Files  1 passed (1)
      Tests  11 passed (11)
```

(The fail-open fix, a flag given with no value now fails closed, is in the same commit b8899da.)

## T004 local dry-run

`NPM_CONFIG_USERCONFIG=/dev/null pnpm -r publish --access public --no-git-checks --dry-run` (no registry login), the `📦` lines:

```
📦 @tunnelmindai/fareseal-core@2.3.0 → https://registry.npmjs.org/
📦 @tunnelmindai/fareseal-adapter-x402@2.3.0 → https://registry.npmjs.org/
📦 @tunnelmindai/fareseal-maze@2.3.0 → https://registry.npmjs.org/
📦 @tunnelmindai/fareseal-hono@2.3.0 → https://registry.npmjs.org/
📦 @tunnelmindai/fareseal-cloudflare@2.3.0 → https://registry.npmjs.org/
```

`grep -c '📦'` → 5: exactly five names at one version (2.3.0). `grep -cE 'adapter-stripe|fareseal-cli|examples|bench'` → 0: cli, adapter-stripe, examples and bench are absent.

CI publish-dry-run log: added by the coordinator at GATE F

## Owner's steps, in order

Commands and checks are from `docs/release/first-npm-release.md`; `<tag>` is `v2.3.0` unless Q1 is answered differently.

1. **Answer Q1** (`docs/release/first-npm-release.md:7`): the first release version. Default if silent: **2.3.0**. Check: with 2.3.0 nothing needs bumping; `node scripts/release-check.mjs --tag v2.3.0` prints `release-check: ok (2.3.0)`. Any other answer needs the seven-file bump (`:50`).
2. **The coordinator applies the prepared bump commit** (`:50`). Check, in a fresh clone checked out at the bump commit (doc Step 1): `git status --short` prints nothing and `git rev-parse HEAD` equals the bump commit SHA.
3. **Tag** (doc Step 7, done after the manual publish and its checks pass): `git tag v2.3.0 && git push origin v2.3.0`. Check: `gh run list -R TunnelMind/tollbooth --workflow publish.yml -L 1`, then `gh run watch`. The run may fail as "already published" because step 4 published first; the doc (`:185`) says what that means and not to bump or delete the tag.
4. **Manual first publish** (doc Steps 2–4), from the repo root: `pnpm install --frozen-lockfile && pnpm build && pnpm test && node scripts/release-check.mjs --tag v2.3.0`, then `npm login --auth-type=web`, then `pnpm -r publish --access public --no-git-checks`. Never `npm publish` inside a package dir. Check: `npm whoami`; then `npm view --prefer-online @tunnelmindai/fareseal-<core|hono|maze|adapter-x402|cloudflare> version` prints `2.3.0` five times (the packument can lag ~2 minutes). Fewer than five: doc Step 8.
5. **Trusted publishers** (doc Step 5): for each of the five packages, npmjs.com, Settings, Trusted Publisher, GitHub Actions, owner `TunnelMind`, repository `tollbooth`, workflow `publish.yml`. Check: each Settings page shows `TunnelMind/tollbooth` with `publish.yml`.
6. **Post-publish checks** (doc Step 6): the three commands there. Check A: `latest` is `2.3.0` for all five. Check B: `NO-PROVENANCE` for all five (expected for a manual first publish). Check C: no `workspace:` in the cloudflare and hono dependencies. Check D: the install smoke test prints `function`.

Order note: the doc runs the tag push as its Step 7, after steps 4–6 pass. The list above follows the order the brief set; do not tag before the publish checks pass.

## `git diff main --stat`

```
 .github/workflows/ci.yml                    |  28 ++++
 .github/workflows/publish.yml               |  23 +--
 docs/release/first-npm-release.md           | 235 ++++++++++++++++++++++++++++
 packages/cloudflare/CHANGELOG.md            |   2 +-
 scripts/release-check.mjs                   | 114 ++++++++++++++
 scripts/release-check.test.ts               | 128 +++++++++++++++
 specs/008-fareseal-publish-ready-1/plan.md  |  53 +++++++
 specs/008-fareseal-publish-ready-1/spec.md  |  94 +++++++++++
 specs/008-fareseal-publish-ready-1/tasks.md |  15 ++
 tsconfig.tests.json                         |   3 +-
 vitest.config.ts                            |   6 +-
 11 files changed, 687 insertions(+), 14 deletions(-)
```

(Excludes the two untracked files this task adds.)

## Scope checks

`git diff main -- 'packages/*/src'` output:

```
```

`git diff main -- 'packages/*/package.json'` output:

```
```

Both are empty.

## Verify

`pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && bun examples/bun-hono/check.ts && node --experimental-strip-types bench/bench.ts --check` exited 0 (61 files, 846 tests passed; no pages-settle timeout this run). `node scripts/release-check.mjs` printed `release-check: ok (no tag)`, exit 0.
