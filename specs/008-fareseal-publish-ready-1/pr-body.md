DRAFT — nothing is published.

**Q1 — owner decision needed first:** which version is the first npm release? Default if you say nothing: **2.3.0** (all seven manifests are already 2.3.0; only the CHANGELOG heading changes). The question and what each answer costs are in `docs/release/first-npm-release.md:7`.

## Summary

- `scripts/release-check.mjs` (+ tests): one home for the release rules: one version, exactly the five public packages (ADR 005), tag equals version, no `workspace:` in packed tarballs.
- `publish.yml` calls the script instead of an inline check (the one that let `v2.0.0-rc.1` through); `ci.yml` gains a credential-free `publish-dry-run` job.
- `docs/release/first-npm-release.md`: the owner's manual first publish, trusted publisher setup and post-publish checks.
- `packages/cloudflare/CHANGELOG.md:5`: heading only. No `packages/*/src` or `package.json` change; no tag, no publish.

Details, test red→green and the local dry-run output: `specs/008-fareseal-publish-ready-1/closeout.md`.

The CI publish-dry-run log is added at GATE F.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
