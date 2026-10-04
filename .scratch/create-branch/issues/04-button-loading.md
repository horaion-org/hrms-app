# 04: Button: loading state

**What to build:** Add `loading?: boolean` to the pill variants of `Button`. While loading, the button shows the mock's 16 px spinner in place of the leading icon, keeps its width, is not clickable, and sets `aria-busy`. Parent spec: `.scratch/create-branch/spec.md` (D6).

**Blocked by:** none

**Status:** ready-for-human

- [x] `loading` applies to `primary` and `secondary` only. For the icon variant it is a type error.
- [x] While loading: the button is `aria-busy="true"` and `aria-disabled="true"`, clicks are ignored, and the label stays visible so the accessible name doesn't change.
- [x] The spinner uses existing tokens and respects `prefers-reduced-motion` (no rotation; it shows static).
- [x] Stories: primary loading and secondary loading.
- [x] Unit tests cover `aria-busy`, ignored clicks, and the unchanged name.
- [x] `pnpm lint` and `pnpm test:unit` pass (full-suite verification owned by parent).

## Comments

- User approved shared Button loading. Added `loading?: boolean` for default/primary and secondary only. Icon, textlink and hyperlink reject loading at the type seam; idle union-variant callers remain compatible.
- Loading retains the label, sets `aria-busy` and `aria-disabled`, disables native buttons and router links, and blocks click callbacks/navigation. A hidden leading icon retains its original layout; the 16 px current-colour spinner overlays its place. Without an icon, the spinner occupies existing left padding to preserve width. `motion-safe:animate-spin` leaves it static with reduced motion.
- Added PrimaryLoading and SecondaryLoading stories. Kept the existing Matrix story idle explicitly so union variant props retain type safety.
- TDD evidence: the new primary/secondary busy-state tests failed before implementation (2 failed, 15 passed); final targeted Button run passed 18 tests, including the unchanged accessible name, ignored/restored click action and disabled router-link behavior. Dialog + Button final targeted run: 22 passed. Logs: `/tmp/horaion-button-red.log`, `/tmp/horaion-components-tests.log`.
- Owned ESLint passed with zero warnings. Global `tsc --noEmit` showed no owned errors after repairing story typing; only concurrent feature `api.test.ts` missing `searchCompanyMembers` remained at that check. No final full-suite claim; parent owns global verification and snapshots.
- Parent browser checks passed: primary idle/busy widths both 162.265625 px; secondary idle/busy widths both 164.265625 px; disabled and `aria-busy` confirmed; reduced-motion spinner computed `animationName: none`. Evidence log: `/tmp/horaion-create-branch-story-checks.log`.
- Standards/spec review completed locally without additional agents. No new dependencies, unsafe TS escapes, translation edits, API changes, commits or snapshot edits.

### Parent final integration verification

- All app checks pass: ESLint zero warnings, Vitest **73 files / 1186 tests** (bounded `--maxWorkers=2`), production TypeScript/Vite build, Storybook production build, and **48 Playwright tests** across Chromium, Firefox and WebKit (two workers). No timeout/configuration relaxation. See `../verification.md` for limits and API evidence.
