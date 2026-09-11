## What

<!-- One paragraph. What changes for the user or the codebase. -->

## Why this way

<!-- The decision and what was rejected. Link the ADR or plan note if one exists. -->

## Security property

<!-- What this change guarantees, or "none" for pure refactors. -->

## Review checklist

- [ ] One concern per commit; each message says why.
- [ ] `pnpm lint`, `pnpm build`, `pnpm exec vitest run src/` pass locally.
- [ ] No token, credential or PII in code, logs, URLs or test fixtures.
- [ ] Every action is gated on a permission key at its scope, and every request handles 403.
- [ ] Errors branch on `error_code`, never on message text.
- [ ] New primitives have a story; new logic has a BDD-named test.
