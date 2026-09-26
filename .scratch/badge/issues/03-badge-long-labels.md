# 03: Badge long labels

**What to build:** A Badge in a narrow container, such as a table cell, stays on one line and cuts its text off with an ellipsis. Hovering it shows the full text. Parent spec: `.scratch/badge/spec.md` (Implementation Decisions, "Title" and "Shape and type").

**Blocked by:** 01 (Badge, Neutral, end to end)

**Status:** resolved

- [x] The Badge never wraps. It can shrink (max width 100% of its parent), and overflowing text ends with an ellipsis.
- [x] `title` defaults to `children`. A caller-supplied `title` replaces it.
- [x] The rounded shape and padding stay intact when truncated.
- [x] Storybook: a story with a long label inside a narrow fixed-width container, showing the ellipsis.
- [x] Unit tests cover the default `title`, a caller's `title` winning, and the single-line truncation classes.
- [x] `pnpm lint` (zero warnings) and `pnpm test:unit` pass.

## Comments

### Implementation checks — 2026-09-26

- Implemented concurrently with ticket 02 in `/tmp/opencode/badge-03`, seeded with the uncommitted ticket-01 baseline. Integrated its delta after ticket 02 using apply_patch; all tone changes retained. No staging or commits.
- Added `min-w-0 max-w-full truncate` while preserving shape, padding and DOM text. `title = children` preserves custom and empty-string overrides and handles explicit undefined.
- LongLabel story reuses Sidebar with a 160px navigation container and `withMemoryRouter`, following the existing-component gate.
- TDD at the public-props → DOM seam: default title **1 failed / 4 passed → 5 passed**; title overrides/undefined fallback **1 failed / 7 passed → 8 passed**; truncation **1 failed / 8 passed → 9 passed**.
- Targeted command: `pnpm exec vitest run src/components/ui/Badge/Badge.test.tsx` — **9 passed**.
- Isolated checks: frozen install, `pnpm lint` (zero warnings), `pnpm test:unit --run` (**459 tests, 13 files**), `pnpm exec tsc --noEmit`, and Badge Prettier check all passed.
- Combined integration: `pnpm lint` passed; `pnpm test:unit --run` **463 tests, 13 files passed**; `pnpm build` passed (typecheck and production build).
- Chromium confirmed 160px Badge/parent widths, 415px scroll width, nowrap/hidden overflow/ellipsis, 24px height, retained padding and full title. Final review found no spec gaps or hard standards violations; Sidebar fixture coupling is a non-blocking follow-up. See [verification](../verification.md).
