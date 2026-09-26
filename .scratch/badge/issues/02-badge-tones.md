# 02: Badge tones

**What to build:** A developer can pass `tone="success" | "warning" | "error"` to a Badge, and the user sees that tone's colours. Every tone meets WCAG AA text contrast. Parent spec: `.scratch/badge/spec.md` (Implementation Decisions, "Colours per tone" and "Warning contrast trade-off").

**Blocked by:** 01 (Badge, Neutral, end to end)

**Status:** resolved

- [x] success: Success 100 background, Success 900 text.
- [x] warning: Warning 100 background, **Neutral 900** text (not a Warning shade; no Warning shade passes AA on Warning 100).
- [x] error: Error 100 background, Error 900 text.
- [x] neutral: unchanged from ticket 01.
- [x] Omitting `tone` still gives Neutral.
- [x] A parameterised unit test over the exported tone constant checks each tone's background and text classes (prior art: Select's status-to-border-class test).
- [x] Storybook: one story per tone, plus an all-tones row matching the mock in `.scratch/badge/design/badge-tones.png`.
- [x] No new colour tokens are added.
- [x] `pnpm lint` (zero warnings) and `pnpm test:unit` pass.

## Comments

### Implementation checks — 2026-09-26

- Implemented in isolated detached worktree `/tmp/opencode/badge-02`, seeded with the uncommitted ticket-01 baseline. Integrated before ticket 03 via apply_patch, without staging or commits.
- Complete `Record<BadgeTone, string>` maps existing tokens. Parameterised DOM test uses exported `badgeTones`. Stories include Default, each tone, and AllTones in mock order with 16px spacing via Storybook's centered layout; no new component or token.
- TDD: `pnpm exec vitest run src/components/ui/Badge/Badge.test.tsx` initially **3 failed / 5 passed** for missing tone classes, then **8 passed**.
- Existing token WCAG calculations: Success **6.45:1**, Warning **9.95:1**, Error **4.88:1**, Neutral **5.04:1**.
- Isolated checks: `pnpm install --frozen-lockfile`, `pnpm lint` (zero warnings), `pnpm test:unit --run` (**458 tests, 13 files**), `pnpm exec tsc --noEmit`, and Badge Prettier check all passed.
- Combined integration: `pnpm lint` passed; `pnpm test:unit --run` **463 tests, 13 files passed**; `pnpm build` passed (typecheck and production build).
- Warning's accessible Neutral text intentionally differs from the mock; designer sign-off remains a follow-up, as specified.
- Chromium confirmed AllTones computed colour values and layout. Final standards/spec review and combined evidence: [verification](../verification.md).
