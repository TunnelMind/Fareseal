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
