# Spec: fareseal-publish-ready-1: clear the four blockers before the first npm release (docs and CI only; no publish)

**Source:** Josh's prompt (2026-11-15), brought from another chat.
**Base:** main `e085f5d` (tollbooth#17 merged). Runbook: `~/.crew/coord/fix5/deploy-runbook-2026-11-13.md`, "Step 7" (READ-ONLY, outside this repo).

## Intent

Remove the four blockers that stop the owner from doing the first npm release of the five public Fareseal packages: the version question, the "Unreleased" CHANGELOG, the tag-triggered publish run that has never succeeded, and the missing trusted publisher. The output is one doc for the owner (`docs/release/first-npm-release.md`), a workflow fix with a CI dry-run job that proves it, and one DRAFT PR; nothing is published and no version is bumped.

Key sentences from the prompt:
- "ONE DRAFT PR for the owner. Do not merge. NOTHING is published: no `npm publish`, no `pnpm publish` outside a dry run, no tag pushed, no workflow run that publishes, no npm login, no token read."
- "Docs ADR 005 holds: 'No agent publishes. The owner publishes.'"
- "decide whether the first release is 2.3.0, 2.4.0 or 3.0.0 under semver for each package; write it as a NUMBERED OWNER QUESTION ... with your pick, the default if he says nothing, and the cost of the other answer. Do not bump any version in package.json until he answers; prepare the bump as a separate commit message text in the doc."
- "fix the 'Unreleased' heading only in the form the doc's default implies (say which)."
- "fix the workflow so a tag run would do exactly what the dry run does (tests must show it: add a CI job that runs the publish workflow's steps in `--dry-run` mode on every PR, with no token)."
- "`pnpm -r publish --access public` so `workspace:*` is rewritten (never a plain `npm publish` in a package dir)"

## Facts found while planning (verified 2026-11-15)

- Publish set (ADR 005, `docs/adr/005-npm-scope-tunnelmindai.md`): core, hono, maze, adapter-x402, cloudflare. `packages/cli` and `packages/adapter-stripe` are `"private": true`; `examples/` and `bench/` are private workspace members. Every `packages/*/package.json` is `2.3.0` (set by 318e964).
- Only `packages/cloudflare/CHANGELOG.md` exists; its heading is `## 2.3.0 — Unreleased` (line 5). It carries the #17 entries A1–A14, L6, T1 (new exported types: `X402VerifyResult.retryAfterS?`, `OfferState.heldInWindow`, `OfferLedger.recordHeld()`) and the hono floor raise from #18.
- The failed tag run is 35177528704 (push, `v2.0.0-rc.1`, 2026-09-17). Its log: step "The tag must equal every package version" failed with `packages/adapter-stripe/package.json is 2.0.0, tag is 2.0.0-rc.1`. The dispatch dry run 35177528100 the same second succeeded because that step is `if: github.event_name == 'push'` (`.github/workflows/publish.yml:47-48`), so the dry run never runs the check the tag run runs. 1aa38ab (3 minutes later) narrowed the trigger to plain semver tags. The OIDC step and the publish steps also diverge by event (`publish.yml:56-68`).
- No trusted publisher can exist yet for the five names (they are not on npm), so the first tag-triggered publish would fail at the PUT (the receipt-verify repo got HTTP 404 the same way on 2026-11-15).
- The runbook says `pnpm -r publish` skips versions already on the registry, "not tested here".

## User Scenarios

### US1 — The owner answers the version question in one word (P1)
**Acceptance:**
1. Given `docs/release/first-npm-release.md`, when the owner reads "Q1", then he sees for each of the five packages the pick (2.3.0 / 2.4.0 / 3.0.0), the semver reason with commit or CHANGELOG line cites, the default if he says nothing, and the cost of the other answers.
2. Given his answer (or silence → default), when the coordinator applies it, then the doc contains the exact bump commit message text (Conventional Commit) and the list of files it touches; no `package.json` version in this PR differs from main.

### US2 — The CHANGELOG matches the release (P1)
**Acceptance:**
1. Given the doc, then it has a CHANGELOG proposal per public package for the default version (the cloudflare one finished, the other four either a proposed new file's text or a stated reason none is needed).
2. Given `packages/cloudflare/CHANGELOG.md`, then its first version heading is no longer `Unreleased` and is in the form the doc's default implies; the doc says which form and why.

### US3 — A tag run does exactly what the dry run does (P1)
**Acceptance:**
1. Given the workflows, when a PR is opened, then a CI job with no token and no `id-token` permission runs the same release checks and `pnpm -r publish --access public --no-git-checks --dry-run` as `publish.yml`, and it lists exactly the five public packages at one version, with no `workspace:` in any packed manifest.
2. Given the old tag `v2.0.0-rc.1`'s situation (a tag that differs from a package version), when the release check runs with that tag, then it fails with a message naming the package and both versions, in the dry run and in the tag run alike.
3. Given `publish.yml`, then the only step whose behaviour depends on dry-run vs real is the final `pnpm -r publish` flag; the version check runs on every tag ref, dispatch included.

### US4 — The owner can do the first publish by hand (P1)
**Acceptance:**
1. Given the doc, then it has a numbered procedure: clone and check out the tagged commit, install, build, test, release check, `pnpm -r publish --access public` (never `npm publish` in a package dir), npm web auth by the owner, then the trusted publisher on each of the five packages' settings pages, then the runbook's post-publish checks (dist-tags, provenance, no `workspace:*` in published dependencies, install smoke test), each step followed by a check and its expected output.
2. The doc says what happens when the tag is pushed after a manual publish (the workflow run and `pnpm -r publish` skipping existing versions), and which steps are irreversible.

## Functional Requirements

- **FR-001** `docs/release/first-npm-release.md` exists with numbered owner questions; Q1 is the version per package with pick, default, cost of the others, and the prepared bump commit message text.
- **FR-002** The doc has a per-package CHANGELOG proposal for the default version; `packages/cloudflare/CHANGELOG.md:5` no longer says `Unreleased` and matches the doc's default form.
- **FR-003** The doc names the root cause of run 35177528704 from its log (quoted line) and `publish.yml` line cites.
- **FR-004** One release-check script (`scripts/release-check.mjs`) is the single place the release rules live: the public package set equals ADR 005's five, all public versions are equal, `--tag vX.Y.Z` must equal that version, and packed manifests contain no `workspace:`. It has a test.
- **FR-005** `publish.yml` calls the script in every mode; the version check runs on any tag ref; real vs dry run differs only in the `--dry-run` flag on the last step.
- **FR-006** `ci.yml` gains a job `publish-dry-run` that runs the publish workflow's steps (minus the OIDC exchange) with `--dry-run`, on every PR and push to main, with `permissions: contents: read` and no secret.
- **FR-007** The doc has the owner's manual first-publish procedure with a check after each step (US4).
- **FR-008** `specs/008-fareseal-publish-ready-1/closeout.md` lists what changed (file:line), the dry-run output (local, and CI once the coordinator opens the draft PR), and the owner's steps in order with a check after each; `pr-body.md` is the draft PR body.
- **FR-009** No `package.json` `version` changes; no publish, tag, npm login or token read by any agent; no change under `packages/*/src`.

## Success Criteria

- **SC-001** Verify (plan.md) passes at the end of every task.
- **SC-002** `git diff main -- 'packages/*/package.json' | grep -c '"version"'` prints `0`; `git diff main --stat -- 'packages/*/src'` is empty.
- **SC-003** `node scripts/release-check.mjs --tag v2.0.0-rc.1` exits non-zero naming a package and both versions; `node scripts/release-check.mjs --tag v2.3.0` exits 0 on this tree.
- **SC-004** `pnpm -r publish --access public --no-git-checks --dry-run` lists exactly 5 packages (`grep -c` of the five names = 5, cli/adapter-stripe/examples/bench absent), locally and in the CI job's log.
- **SC-005** `grep -n 'Unreleased' packages/cloudflare/CHANGELOG.md` prints nothing.
- **SC-006** `grep -nE "^## Q[0-9]+" docs/release/first-npm-release.md` prints at least Q1; the doc contains `pnpm -r publish --access public` and no instruction to run `npm publish` inside a package directory.
- **SC-007** The draft PR's CI is green, including `publish-dry-run` (GATE F).

## Edge Cases

- A partial publish (some of five land): the doc says re-running `pnpm -r publish` from the same commit publishes only the rest (verify against pnpm docs, or say "unverified").
- The owner pushes the tag after a manual publish: the tag run must not fail loudly for a no-op, or the doc says it will and why that is harmless.
- `pnpm -r publish --dry-run` with pnpm 11.5.1 and no auth: must not try to authenticate; if it does, the CI job fails and the task records the fix.
- A private package with a mismatched version (the v2.0.0-rc.1 failure was adapter-stripe, private): the script checks every `packages/*` version (repo-wide one-version rule, `publish.yml:47`), not just the public five; the doc states this.
- Packed manifest `devDependencies` also contain `workspace:*` (e.g. `packages/hono/package.json:22-24`); `pnpm pack` rewrites them; the check covers dependencies, peerDependencies, optionalDependencies and devDependencies.
- CHANGELOG.md is not in cloudflare's `files` list; npm may or may not ship it. The doc says whether it ships (from the dry run's file list).

## Assumptions

- The owner's npm account owns the `@tunnelmindai` scope (ADR 005).
- npm still requires an existing package to configure a trusted publisher (consistent with the 2026-11-15 404); the doc cites docs.npmjs.com and says when it was read, or marks it unverified.
- The site does not install from npm (runbook 7b); the semver decision protects future npm consumers, and the site's vendored 2.2.0 is the only current consumer.
- `gh run view` on the public repo is read-only and allowed.

## Out of Scope

- Any publish, tag, push, npm login, token, trusted-publisher configuration (all owner tasks).
- Bumping versions; the site re-vendor (runbook 7b); any code under `packages/*/src`; Stripe code; renaming the repo slug.

## Open Questions

None that change what gets built. Q1 (the version) is the owner's question inside the doc, defaulted; GATE 0 is the coordinator's review of plan.md, as the prompt asks.
