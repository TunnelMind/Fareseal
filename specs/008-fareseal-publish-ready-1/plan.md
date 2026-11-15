# Plan: fareseal-publish-ready-1

## Constitution check (`constitution.md`, repo root)

- Art. I–VI (runtime behaviour): untouched; no change under `packages/*/src` (FR-009).
- Art. VII.21 (every FR has a test): FR-004/005/006 are covered by `scripts/release-check.test.ts` and the CI job `publish-dry-run`; FR-001/002/003/007/008 are docs, checked by the grep criteria in spec.md SC-002…SC-006.
- Art. VII.22 (no telemetry/phone-home): the CI dry run talks to the registry only as `pnpm publish --dry-run` does; no new runtime network call.
- Art. VII.23 (dependency budget): no new dependency. The script uses only `node:` modules and `pnpm`/`tar` already on the runner.
- Art. VII.24 (ADR before contradicting plan.md): this run does not contradict the root `plan.md` or ADR 005; it implements ADR 005's "The owner publishes". No ADR task. If T001 concludes the release must be 3.0.0 *and* that contradicts a documented versioning rule (318e964's "repo convention"), the coder records it in the doc as part of Q1, not as an ADR; the owner decides.
- ADR 005: "No agent publishes. The owner publishes." Every publish, tag, login and trusted-publisher step is an `(owner)` task.
- GATE 0: the prompt asks for a coordinator review of this plan before any change.

## Where the change goes

| Path | Change |
|---|---|
| `docs/release/first-npm-release.md` (new) | Q1 version per package; bump commit text; CHANGELOG proposals; failed-run root cause; owner's manual first publish + post-publish checks |
| `packages/cloudflare/CHANGELOG.md:5` | `## 2.3.0 — Unreleased` → the form the doc's default implies |
| `scripts/release-check.mjs` (new) | the release rules, one place (FR-004) |
| `scripts/release-check.test.ts` (new) | its test |
| `vitest.config.ts` | add `scripts/**/*.test.ts` to `include` |
| `tsconfig.tests.json` | add `scripts` to `include` only if the test needs typechecking to pass `pnpm typecheck` (prefer: include it) |
| `.github/workflows/publish.yml:47-68` | version check on any tag ref via the script; dry vs real differs only in the last step's flag |
| `.github/workflows/ci.yml` | new job `publish-dry-run` (no token, `contents: read`) |
| `specs/008-fareseal-publish-ready-1/closeout.md`, `pr-body.md` (new) | closeout and draft PR body |

No `package.json` version changes; no `packages/*/src` change.

## Approach

1. **Version (T001).** Read `git log 318e964..e085f5d` (version set to 2.3.0 at 318e964; main was 6825c30 when 2.3.0 was planned), `packages/cloudflare/CHANGELOG.md`, `specs/006-fareseal-contract-o1o4-1/spec.md` + `closeout.md`, `specs/007-fareseal-hono-advisories-1/closeout.md`, and `git diff 6825c30 e085f5d -- 'packages/*/src/index.ts' 'packages/*/package.json'` for exported-surface changes per package. Classify each package: breaking exported type change (e.g. a new REQUIRED field on an exported interface a caller may construct, such as `OfferState.heldInWindow`), new export / optional field (minor), behaviour-only fix (patch/minor per what semver and the repo's one-version rule say). Key context the doc must weigh: nothing has ever been on npm under these names, so 2.3.0 is unspent; the only consumer is the site's vendored 2.2.0; the repo enforces one version for every `packages/*` (`publish.yml:47`). Write Q1 with pick, default and costs; the bump commit text (e.g. `chore(release): 2.4.0 — first npm release of the five public packages`) with the exact files it would touch.
2. **CHANGELOG (T002).** Proposal per public package in the doc; fix the cloudflare heading in the form the default implies. A release date is not known until the owner publishes, so the heading must not invent one: e.g. default 2.3.0 → `## 2.3.0 — first npm release (date set by the bump commit)`, default 2.4.0/3.0.0 → that version with the same note, and the bump commit text in the doc writes the date. The coder picks the exact form, writes the reason in the doc, and keeps every bullet unchanged.
3. **Workflow (T003 then T004).** Root cause (planning fact): run 35177528704 failed at `publish.yml:47-54` (`packages/adapter-stripe/package.json is 2.0.0, tag is 2.0.0-rc.1`); the dispatch dry run skipped that step (`if: github.event_name == 'push'`). Fix: move the checks to `scripts/release-check.mjs` (`--tag <ref>` optional; reads `packages/*/package.json`; asserts public set == ADR 005's five, one version across all `packages/*`, tag == version; `--packed <dir>` asserts no `workspace:` in any dependency field of every packed `package.json`). `publish.yml` runs it with `--tag "$GITHUB_REF_NAME"` whenever `startsWith(github.ref, 'refs/tags/')` (dispatch on a tag included), runs `pnpm -r pack` into a temp dir and `--packed` on it, then `pnpm -r publish --access public --no-git-checks` with `--dry-run` appended when dry. The OIDC claims step stays in publish.yml only (it needs `id-token: write`). `ci.yml` job `publish-dry-run` runs the same install/build/test/release-check/pack/publish `--dry-run` steps with Node 22.14 and npm 11.6.1 as publish.yml pins. Keep step names identical between the two files so a reader can diff them. ponytail: duplicated steps in two YAML files rather than a reusable workflow; the script holds the rules, so drift can only be in the step list.
4. **Manual first publish (T005).** From the runbook Step 7 (read-only) and npm/pnpm docs (cite URL + date read, or mark unverified). Must cover: why the first publish is manual (trusted publisher needs an existing package; the 2026-11-15 404); fresh clone at the tag; `pnpm install --frozen-lockfile && pnpm build && pnpm test && node scripts/release-check.mjs --tag vX.Y.Z`; owner's npm web login (`npm login --auth-type=web`, in tmux with `BROWSER=true` per the gotchas the runbook cites); `pnpm -r publish --access public --no-git-checks` from the repo root (never `npm publish` in a package dir: it would ship `workspace:*`); provenance: a local publish has no provenance, so the doc says the first version ships without it and the runbook's provenance check applies from the first trusted-publisher version (or names how to get it); trusted publisher per package (settings page, repo `TunnelMind/tollbooth`, workflow `publish.yml`); post-publish checks from the runbook with expected output; order with the tag push and what the tag run then does (`pnpm -r publish` skips existing versions — verify from pnpm docs or mark unverified); irreversibility notes from the runbook.
5. **Closeout (T006).** File:line list, local dry-run output, owner steps with checks; the coordinator adds the CI run's `publish-dry-run` log at GATE F.

## Risks

- `pnpm -r publish --dry-run` may still contact the registry (to check existing versions) and could behave differently without auth; T004 runs it locally with no npm auth (`NPM_CONFIG_USERCONFIG=/dev/null`) and records the output.
- `pnpm pack` vs `pnpm publish` manifest rewriting could differ; T004 compares the `--dry-run` tarball contents with the packed ones in its note.
- A version answer of 3.0.0 or 2.4.0 changes the CHANGELOG heading T002 writes; T002 follows the default and the doc says what the other answers change (one line each).
- `scripts/` is new to typecheck/vitest scope; T003 must keep `pnpm lint` and `pnpm typecheck` green.
- Nothing here can prove the real (non-dry) publish path works; the doc says so plainly.

## Verify (every task)

From `.github/workflows/ci.yml` (job `ci`), in order:

```
pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && bun examples/bun-hono/check.ts && node --experimental-strip-types bench/bench.ts --check
```

From T003 on, also `node scripts/release-check.mjs`; from T004 on, also the `publish-dry-run` job's commands run locally (listed in T004).
