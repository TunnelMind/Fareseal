# First npm release of Fareseal (owner questions and procedure)

Status: draft for the owner. Nothing is published, no tag is pushed, and no `package.json` version is changed by this document. ADR 005: "No agent publishes. The owner publishes."

Public packages (ADR 005, `docs/adr/005-npm-scope-tunnelmindai.md`): `core`, `hono`, `maze`, `adapter-x402`, `cloudflare`. `packages/cli` and `packages/adapter-stripe` are `"private": true`.

## Q1 — the first release version

**Question for the owner:** is the first npm release 2.3.0, 2.4.0 or 3.0.0?

**Baseline.** Nothing is on npm, so semver has no registry baseline. The only previous release state is 2.2.0, the state the site vendored (`514bb79`; `packages/cloudflare/CHANGELOG.md:7`). Every `packages/*/package.json` is already `2.3.0` (set by `318e964`). "Since 2.2.0" below means `git diff 514bb79 e085f5d`.

**One number for all.** `.github/workflows/publish.yml:47` ("The tag must equal every package version (one repo-wide version)") loops over `packages/*/package.json`, which is **seven** manifests, not five: the five public ones plus the private `cli` and `adapter-stripe`. The spec's "seven" is the count of manifests the check reads; ADR 005 narrows what is *published* to five. So whichever number is picked, all seven `package.json` files carry it, and the tag is `v<that number>`. A 2.3.0 → 2.4.0 or 3.0.0 choice moves seven files, not five.

### Per package: changes since 2.2.0, semver class

Already in 2.2.0, so NOT a change: an unknown `[toll.x402] network` throwing `ConfigError` (`6ba90dc` is an ancestor of `514bb79`).

**core** — class: **minor** (additive exports, behaviour fixes).
- New exports `isOperatorFault`, `isNoOfferFault`: `packages/core/src/index.ts:50-51`, defined `packages/core/src/pipeline.ts:118` and `:138` (`18a7f94` introduced `isOperatorFault`, `673182e` `isNoOfferFault`; neither is in 2.2.0).
- `OfferState.heldInWindow` (`packages/core/src/ledger.ts:12`) and `OfferLedger.recordHeld()` (`ledger.ts:93`), `usableState()` (`ledger.ts:144`): `de4c7ad` (O3), `e9adf06` (R005).
- Behaviour: held repeats capped at 60 per window per verified agent key, then they record an offer (`pipeline.ts:102`, `:379-400`); no-offer faults record no offer (`pipeline.ts:392`).
- Comment-only promise: `packages/core/src/config.ts:134-135` says the old `/.well-known/tollbooth-site.json` fallback is tried "until 3.0.0". A 3.0.0 release is the point at which that promise says the fallback may go.

**hono** — class: **minor** (one optional field; behaviour fixes; dependency floor raise).
- `X402VerifyResult.retryAfterS?: number`: `packages/hono/src/index.ts:79` (`7989897`); 402 gains `retry-after` (`index.ts:749-752`).
- Behaviour: `settle-unconfirmed` text changed and its 402 and `no-transaction-id`'s are now error-only, no `x-payment-required`/`accepts`/`options` (`index.ts:630`, `:705-720`; `926bb12`, `c6d1e92`). A client that read `accepts` from those 402s no longer gets it: the one change a strict reader could call breaking.
- Peer and dev `hono` floor `^4.13.7` → `^4.13.16` (`packages/hono/package.json:25,28`; `68b322e`, GHSA-h7mg-cq63-vhpq). A consumer pinned to hono 4.13.7–4.13.15 must upgrade: arguably breaking for installs, but the previous range was unsafe on the wildcard route.

**maze** — class: **patch-equivalent, version only** (no source change since 2.2.0: `git diff 514bb79 e085f5d -- packages/maze` is `package.json` only, the 2.3.0 set). Ships because of the one-version rule.

**adapter-x402** — class: **minor** (additive export).
- `MAX_X_PAYMENT_CHARS = 8192`: `packages/adapter-x402/src/index.ts:214`; `verifyProof` refuses a longer header as `malformed` (`index.ts:228`).

**cloudflare** — class: **minor** (additive exports, many 402 behaviour fixes; see `packages/cloudflare/CHANGELOG.md:5-70`, rows A1–A14, L6, T1).
- New exports `SETTLE_TIMEOUT_MS` (25 s, `packages/cloudflare/src/index.ts:106`), `RESERVATION_TTL_MS` (`:115`), `BUILD_TTL_MS` (`:120`), `UNCONFIRMED_CAP` (`:129`), `UNCONFIRMED_TTL_MS` (`:130`).
- Behaviour: per-payer in-flight reservation (A1, `e1c97cd`), `Retry-After` on the held 402 (A2, `7989897`), hold put back or not on due attempts (A4–A7, `74014c7`), cooldown stamped at write (A8, `a8c2e0f`), 25 s settle timeout answered `settle-unconfirmed` (A9), shared state build on a cold isolate (L6, `9497d4b`), hono floor raise (`68b322e`).
- `CHANGELOG.md` is not in `files` (`packages/cloudflare/package.json:13-17`: `dist`, `README.md`, `LICENSE`), so it is not shipped.

### The pick

| Answer | Pick? | Why |
|---|---|---|
| **2.3.0** | **Pick, and the default if the owner says nothing** | All additive exports and fixes, so semver says minor from 2.2.0. All seven manifests are already 2.3.0, the CHANGELOG already says 2.3.0, `v2.3.0` passes the tag check on this tree. Zero files to change besides the CHANGELOG heading. |
| 2.4.0 | no | Needs a seven-file bump and a CHANGELOG heading rename; buys nothing, since 2.3.0 was never on npm. Cost: one extra commit and a gap in numbering that readers will ask about. |
| 3.0.0 | no | Honest only if the error-only 402 (A11), the hono floor raise, or the dropped 4th-concurrent payment (A1, a known cost) are called breaking. Cost: seven-file bump, CHANGELOG rename, and the `config.ts:134-135` promise comes due (the tollbooth well-known fallback is meant to go "until 3.0.0"), so either remove it in this release (a `packages/core/src` change this PR is not allowed to make) or break the stated promise. |

Default if silence: **2.3.0**; the CHANGELOG heading becomes `## 2.3.0 — first npm release (date set by the bump commit)`, dropping "Unreleased" (see "CHANGELOG proposal" below; the date is not invented, the owner's release commit writes it).

### Prepared bump commit

Not applied. Only for an answer other than the default. For the default (2.3.0) there is nothing to bump: the only file touched is `packages/cloudflare/CHANGELOG.md` (heading, line 5).

For 2.4.0 or 3.0.0 (replace `X.Y.Z`), exact message:

```
chore(release): X.Y.Z

Set "version" to X.Y.Z in all seven packages/*/package.json (publish.yml:47
requires one repo-wide version). Rename the packages/cloudflare/CHANGELOG.md
heading from "2.3.0 — Unreleased" to "X.Y.Z".
```

Files it would touch (9):
- `packages/core/package.json`, `packages/hono/package.json`, `packages/maze/package.json`, `packages/adapter-x402/package.json`, `packages/cloudflare/package.json` (public)
- `packages/cli/package.json`, `packages/adapter-stripe/package.json` (private; the tag check still reads them)
- `packages/cloudflare/CHANGELOG.md`
- `pnpm-lock.yaml` only if `pnpm install --frozen-lockfile` fails afterwards (workspace links carry no version; the `2.3.0` hits in the lockfile are `@noble/*`, unrelated).

## Verify record (T001)

Command: `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && bun examples/bun-hono/check.ts && node --experimental-strip-types bench/bench.ts --check`, run 2026-11-15 on this worktree.

- install, lint, typecheck: passed.
- `pnpm test`: 834 passed, 1 failed (60 files, 1 failed). The one failure: `packages/cloudflare/test/pages-settle.test.ts:1112` "R012 M2: the unconfirmed map is capped at UNCONFIRMED_CAP, oldest out" — `Test timed out in 5000ms`. It passed alone on this tree (`vitest run … -t 'unconfirmed map is capped'`, 1 passed, 3.2 s), so it is a load timeout, not a logic failure. No other test timed out in this run: `settle-budget.test.ts:265` ("100 sequential → 3") and the settle-budget OQ1 test passed this time. Whether the 5000 ms timeouts (these and others) also fail on clean `e085f5d` is for QA's baseline; I did not run clean `e085f5d` myself. No test or timeout was edited.
- `pnpm test` exits non-zero, so the `&&` chain stopped; I ran the last two separately: `bun examples/bun-hono/check.ts` and `bench.ts --check` (NFR-1 PASS, added p50 0.000 ms, p99 0.012 ms) both exit 0.

## CHANGELOG proposal

Only `packages/cloudflare` has a `CHANGELOG.md`; the other four public packages have none (`ls packages/*/CHANGELOG.md`).

**Heading chosen (default 2.3.0, Q1).** `packages/cloudflare/CHANGELOG.md:5` was `## 2.3.0 — Unreleased`; it is now `## 2.3.0 — first npm release (date set by the bump commit)`. Why: "Unreleased" is false once the owner publishes and would ship stale; the publish date is unknown until the owner publishes (ADR 005), so none is invented; the placeholder says who fills it in. The bullets under it (A1–A14, L6, T1 rows) are byte-identical to main; only line 5 changed.

**What each other Q1 answer changes** (one line each):
- 2.3.0 (default): heading as above; no `package.json` change.
- 2.4.0: heading becomes `## 2.4.0 — first npm release (date set by the bump commit)`, and the bullet line 7 ("2.3.0 marks this payment-path refresh") then needs the owner's wording; seven manifests move.
- 3.0.0: same heading rename to `## 3.0.0 — first npm release (…)`, plus a "Breaking" bullet for A11 / hono floor / A1 and the `config.ts:134-135` fallback decision; seven manifests move.

**Pre-existing, not touched.** `packages/cloudflare/CHANGELOG.md:78` `## 2.1.0 — Unreleased` is a stale heading from before 2.2.0/2.0.1; this task leaves it alone (`grep -n Unreleased` prints only that line).

**Proposed entries for the other public packages.** None needed as files: core, hono, maze and adapter-x402 ship no CHANGELOG and none is in their `files`, so a new file would be unpublished clutter and the "Per package" section above already records their changes for release notes. If the owner wants GitHub release notes, use these lines:
- core 2.3.0: new exports `isOperatorFault`, `isNoOfferFault`; held repeats capped at 60 per window per verified agent key; no-offer faults record no offer.
- hono 2.3.0: `X402VerifyResult.retryAfterS?`; held 402 carries `retry-after`; `settle-unconfirmed` and `no-transaction-id` 402s are error-only; `hono` peer floor `^4.13.16` (GHSA-h7mg-cq63-vhpq).
- maze 2.3.0: version only, no source change since 2.2.0 (one-version rule).
- adapter-x402 2.3.0: `MAX_X_PAYMENT_CHARS = 8192`; a longer `X-PAYMENT` header is refused as `malformed`.

## Owner: first publish by hand

Written 2026-11-15. Owner only (ADR 005: "No agent publishes. The owner publishes."). The agent never logs in to npm, never reads a token, never pushes the tag.

**Why by hand.** npm configures a trusted publisher on an *existing* package's settings page, and none of the five packages exists yet (an `npm view` on 2026-11-15 gave a 404; runbook `deploy-runbook-2026-11-13.md`, Step 7, blocker 1). So the tag workflow cannot do the first publish. This procedure is the manual first publish; after it, trusted publishing takes over. Unverified: that npm still has no way to pre-register a trusted publisher for a package that does not exist (docs.npmjs.com/trusted-publishers, not read in this task); check that page before step 3 and, if pre-registration exists, tell the coordinator — this procedure would change.

`<tag>` below is `v2.3.0` unless the owner answered Q1 differently. The tag does not exist until step 7. Step 1 clones the **bump commit** (the commit whose seven `packages/*/package.json` carry that version; with the 2.3.0 default, the commit that merged this branch to `main`). Do not tag before step 6.

Every `npm`/`pnpm` claim below cites its source or says "unverified". Sources: docs.npmjs.com and pnpm.io, **not read in this task (no web access); every citation is the page to read, dated 2026-11-15 as "to check", not "read"**. Claims taken from this repo (`scripts/release-check.mjs`, `.github/workflows/publish.yml`) or the runbook are marked as such.

### Step 1 — Fresh clone at the bump commit

```sh
git clone https://github.com/TunnelMind/tollbooth.git ~/fareseal-publish && cd ~/fareseal-publish
git checkout --detach <bump-commit-sha>   # the reviewed commit, not whatever main is today
git log -1 --format='%H %s'
```

Check: `git status --short` and `git rev-parse HEAD`.
Expected: `git status --short` prints nothing; `git rev-parse HEAD` equals `<bump-commit-sha>` exactly (a bare clone gives main's current HEAD, which may be newer than what was reviewed). A fresh clone matters because `pnpm publish` ships whatever is in the working tree's `dist/`; a stale local build would publish it.

### Step 2 — Install, build, test, release-check

```sh
pnpm install --frozen-lockfile && pnpm build && pnpm test && node scripts/release-check.mjs --tag v2.3.0
```

Check: the command exits 0 (`echo $?` prints `0`), and the release-check line.
Expected: install, build and tests pass; `node scripts/release-check.mjs --tag v2.3.0` exits 0 and prints `release-check: ok (2.3.0)` (`scripts/release-check.mjs` header: all packages share one version and the public set is exactly the five of ADR 005). Known flake: some `packages/cloudflare/test` tests can time out at 5000 ms under load (seen at `pages-settle.test.ts:1112` on 2026-11-15; passes alone). Re-run `pnpm test` once; if the same test still fails, stop and ask. The command uses the tag form, so it exits non-zero if any package version differs from the tag (script header); use your Q1 version in place of `v2.3.0`. Also run `node scripts/release-check.mjs` without `--tag` once: it exits 0 and prints `release-check: ok (no tag)`.

### Step 3 — npm web login (owner's own account)

```sh
npm login --auth-type=web
```

Run it in tmux with `BROWSER=true` if no browser opens on the host (runbook Step 7, blocker 1, citing the gotchas file); open the printed URL yourself and approve with your passkey. Source: docs.npmjs.com/cli/commands/npm-login (to check 2026-11-15; `--auth-type=web` unverified against the page).

Check: `npm whoami`.
Expected: prints your npm username, the account that owns the `@tunnelmindai` scope (ADR 005). If it errors with `ENEEDAUTH`, the login did not complete. Also run `npm --version`; the tag workflow pins npm 11.6.1, trusted publishing needs ≥ 11.5.1 (`publish.yml` header, citing docs.npmjs.com/trusted-publishers read 2026-09-17), but a manual publish needs no particular npm version (unverified).

### Step 4 — Publish from the repo root

```sh
pnpm -r publish --access public --no-git-checks
```

Run this **from the repository root**, and never `npm publish` inside a package directory. Why: the packages depend on each other as `workspace:*`; `pnpm publish` rewrites those to real versions in the tarball, plain `npm publish` does not and would ship `workspace:*`, which no installer can resolve (runbook Step 7; pnpm.io/cli/publish and pnpm.io/workspaces, to check 2026-11-15, unverified). The release-check run in Step 2 covers the root-level pnpm publish; a per-package `npm publish` bypasses that procedure and also skips the `workspace:*` rewrite. `-r` skips the two `"private": true` packages, `cli` and `adapter-stripe` (`publish.yml` header; pnpm.io/cli/recursive, unverified). `--no-git-checks` is there because the workflow uses it and the clone may not be on a named branch (pnpm.io/cli/publish, unverified). `--access public` is needed for a scoped package's first publish (docs.npmjs.com/creating-and-publishing-scoped-public-packages, unverified). npm may ask for a web approval per package.

Check: for each package, `npm view --prefer-online @tunnelmindai/fareseal-<core|hono|maze|adapter-x402|cloudflare> version`.
Expected: five lines, each `2.3.0` (the packument can lag about 2 minutes, runbook Step 7; wait and re-run before suspecting a failure). If fewer than five, go to step 8.

### Step 5 — Trusted publisher on each of the five packages

For each of `@tunnelmindai/fareseal-core`, `-hono`, `-maze`, `-adapter-x402`, `-cloudflare` (ADR 005, `scripts/release-check.mjs` `PUBLIC`): open its page on npmjs.com, Settings, Trusted Publisher, choose GitHub Actions, and enter repository owner `TunnelMind`, repository `tollbooth`, workflow filename `publish.yml` (the filename must match exactly; `publish.yml` header, docs.npmjs.com/trusted-publishers read 2026-09-17). Leave the environment field empty (`publish.yml` has no `environment:`). The repo slug is still `tollbooth` although the product is Fareseal; it must be the slug GitHub uses.

Check: re-open each package's Settings page.
Expected: five pages, each showing a GitHub Actions publisher `TunnelMind/tollbooth` with `publish.yml`. This binding is what lets the tag workflow publish without a token; no token is created or stored anywhere (`publish.yml` header).

### Step 6 — Post-publish checks (runbook Step 7)

```sh
for p in core hono maze adapter-x402 cloudflare; do printf '%s ' $p; curl -s https://registry.npmjs.org/@tunnelmindai/fareseal-$p | jq -r '."dist-tags".latest, (.versions["2.3.0"].dist.attestations.provenance.predicateType // "NO-PROVENANCE")' | tr '\n' ' '; echo; done
curl -s https://registry.npmjs.org/@tunnelmindai/fareseal-cloudflare | jq -c '.versions["2.3.0"].dependencies'
( cd "$(mktemp -d)" && npm init -y >/dev/null && npm install @tunnelmindai/fareseal-cloudflare@2.3.0 >/dev/null && node -e "import('@tunnelmindai/fareseal-cloudflare').then(m=>console.log(typeof m.createPagesMiddleware))" )
```

Check A, dist-tags: the first command's first value per line.
Expected: `2.3.0` for all five (`latest`; a first publish sets `latest` by default, docs.npmjs.com/cli/commands/npm-dist-tag, unverified).

Check B, provenance: the second value per line.
Expected for a **manual first version: `NO-PROVENANCE` for all five.** The runbook expects a slsa provenance type, but that is for a tag-workflow publish: provenance comes from the GitHub Actions OIDC identity (`publish.yml` header, docs.npmjs.com/trusted-publishers read 2026-09-17), and a publish from the owner's machine has none (docs.npmjs.com/generating-provenance-statements, unverified). So 2.3.0 ships without it and will never get it, since a version cannot be republished. Provenance starts with the first version the tag workflow publishes (2.3.1 or later). If provenance on 2.3.0 matters, stop before step 4 and ask; the only way is to publish from the workflow, which cannot run until the packages exist, so this is a real trade, not an oversight.

Check C, no `workspace:*`: `npm view @tunnelmindai/fareseal-cloudflare@2.3.0 dependencies --json`, and the same for `-hono` (depends on core). Only cloudflare (four workspace dependencies) and hono have fareseal runtime dependencies; maze and adapter-x402 have none, so they cannot carry `workspace:*` between packages. The second command above gives the same for cloudflare.
Expected: real versions for the fareseal dependencies (`"2.3.0"`), and the output contains no `workspace:`. A `workspace:` hit means someone ran `npm publish` in a package dir: go to step 9.

Check D, install smoke test: the third command.
Expected: prints `function`. Anything else (an `undefined`, an install error) means the published tarball is broken: go to step 9.

### Step 7 — Tag push, and what the tag run does

```sh
git tag v2.3.0 && git push origin v2.3.0
```

Do this after steps 4 to 6 pass, from the step 1 clone (HEAD is the bump commit). The tag must be the plain `vX.Y.Z` form; `rc` tags never trigger the workflow (`publish.yml` `on.push.tags`).

Check: `gh run list -R TunnelMind/tollbooth --workflow publish.yml -L 1`, then `gh run watch` on it.
Expected: the run starts on the tag. It installs, builds, tests, checks the tag equals every `packages/*/package.json` version (inline today in `publish.yml`; the release-check script once T004 lands), requests an OIDC token, and runs `pnpm -r publish --access public --no-git-checks`. Because 2.3.0 is already on npm from step 4, this publish has nothing new to publish. What happens then is **unverified**: runbook Step 7 says `pnpm -r publish` skips versions already on the registry (pnpm.io/cli/publish, to check), but the runbook itself notes "that behaviour was not tested here". Two outcomes: (a) the step succeeds having skipped all five, fine; (b) the publish step fails with an already-published error (`E403`/"cannot publish over the previously published versions"). In (b), nothing is wrong with the packages: the manual publish already did the job. Do **not** bump the version to make the run green and do not delete the tag expecting it to unpublish anything. Note the failed run in the owner's log, and let the next release (2.3.1) be the first publish through the workflow; it also proves the trusted publisher from step 5. A failure at the OIDC step instead means step 5 is wrong (workflow filename, repo, or owner); fix the settings page, then re-run the workflow with `gh run rerun`.

### Step 8 — Partial publish (stopped after N of 5)

Symptom: step 4 printed an error, or step 4's check showed fewer than five `2.3.0` lines (for example an expired web approval, a network drop, or a failed package).

State: the packages that landed are final; they cannot be republished or re-versioned (step 9). The rest do not exist at 2.3.0. Packages publish in dependency order (pnpm.io/cli/recursive, unverified), so the ones that landed are the ones others depend on, and the missing ones may depend on a landed one: that is fine (`workspace:*` is rewritten to `2.3.0`, which exists).

Recovery: find which names have no 2.3.0 (`npm view --prefer-online <name> version`, a 404 or an older version means missing), fix the cause, then publish the rest **at the same version**. Re-running `pnpm -r publish --access public --no-git-checks` from the repo root should skip the ones already published and publish the rest (runbook Step 7; pnpm behaviour **unverified**); if it errors on the existing ones, run `pnpm --filter <package-name> publish --access public --no-git-checks` from the repo root for each missing package (pnpm.io/filtering, unverified). **Never bump the version to "fix" a partial**: the repo carries one version for all seven manifests (`publish.yml` tag check), so a bump moves all packages and leaves a gap, two numbering schemes, and an orphan 2.3.0 on the ones that landed. Then continue at step 5 with the full five.

Check: `for p in core hono maze adapter-x402 cloudflare; do npm view --prefer-online @tunnelmindai/fareseal-$p version; done`.
Expected: after recovery, five lines of `2.3.0`; then continue at step 5. Before recovery, the missing names print an E404 or an older version.

### Step 9 — Irreversibility

- A published `name@version` can never be re-used, even after unpublish: 2.3.0 is spent for each of the five names the moment it lands (runbook Step 7; docs.npmjs.com/policies/unpublish, to check 2026-11-15).
- `npm unpublish` is allowed only within 72 hours of publish, and only while nothing depends on the package; after that, `npm deprecate` is the only tool, and an unpublished name is blocked for 24 hours (runbook Step 7; docs.npmjs.com/policies/unpublish, unverified; the 72h and 24h figures come from the runbook, not from the npm page).
- Within the window, a bad version: `npm unpublish @tunnelmindai/fareseal-<x>@2.3.0` per package; the version number is still burned, so the fix ships as 2.3.1 for all five (never a partial bump).
- Deleting the git tag unpublishes nothing.
- The five names become the public identity of the product and the package `repository.url` must stay resolvable (`github.com/TunnelMind/tollbooth`), or provenance on later versions breaks (runbook Step 7).

Check: `npm view @tunnelmindai/fareseal-core time --json` (repeat per package).
Expected: a `"2.3.0"` key with the publish timestamp. Less than 72 hours ago: `npm unpublish` is still possible if nothing depends on the package; later: only `npm deprecate` applies (runbook Step 7; docs.npmjs.com/policies/unpublish, unverified; the `time` field of `npm view` is unverified too).

## Why the v2.0.0-rc.1 tag run failed

Run 35177528704 (push of tag `v2.0.0-rc.1`, 2026-09-17) failed at the step "The tag must equal every package version (one repo-wide version)". `gh run view 35177528704 --log-failed` now prints nothing (the log has expired); the same run's annotation, read with `gh run view 35177528704 --job 105062405685`, still carries the line:

```
X packages/adapter-stripe/package.json is 2.0.0, tag is 2.0.0-rc.1
```

The dispatch dry run beside it (run 35177528100, same tag, `workflow_dispatch`) went green because the tag check was `if: github.event_name == 'push'` and so was skipped. A dry run therefore did not rehearse the check that stopped the real run.

**Fix.** `.github/workflows/publish.yml:53-55` runs `node scripts/release-check.mjs --tag "$GITHUB_REF_NAME"` under `if: startsWith(github.ref, 'refs/tags/')` (dispatch on a tag included); `:56-59` packs and runs `--packed` in every mode; `:68-69` is the single publish step, `--dry-run` appended only for `workflow_dispatch` with `inputs.dry_run`. `.github/workflows/ci.yml:31` adds the `publish-dry-run` job (`contents: read`, no secrets, no `id-token`) so every PR runs the same steps.

### Local run of the `publish-dry-run` commands (`NPM_CONFIG_USERCONFIG=/dev/null`, 2026-11-15)

- `node scripts/release-check.mjs` → `release-check: ok (no tag)`, exit 0.
- `pnpm -r pack --pack-destination <dir>` then `node scripts/release-check.mjs --packed <dir>` → `release-check: packed manifests clean`, exit 0. `pack` also writes the private `cli` and `adapter-stripe` tarballs (all seven, `…-2.3.0.tgz`); the check passes on all seven, and publish skips the private two.
- `pnpm -r publish --access public --no-git-checks --dry-run` → exit 0, exactly five packages, one version (the `📦` lines; `adapter-stripe`, `cli`, `examples`, `bench` do not appear):

```
📦 @tunnelmindai/fareseal-adapter-x402@2.3.0 → https://registry.npmjs.org/
📦 @tunnelmindai/fareseal-cloudflare@2.3.0 → https://registry.npmjs.org/
📦 @tunnelmindai/fareseal-core@2.3.0 → https://registry.npmjs.org/
📦 @tunnelmindai/fareseal-hono@2.3.0 → https://registry.npmjs.org/
📦 @tunnelmindai/fareseal-maze@2.3.0 → https://registry.npmjs.org/
```

- CHANGELOG in the tarball: no. The cloudflare tarball holds `dist/`, `LICENSE`, `package.json`, `README.md` only; `tar -tzf` on all seven tarballs finds no `CHANGELOG`.
