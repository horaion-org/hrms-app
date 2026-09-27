# 10: Preserve the keyboard range preview on pointer exit

**Status:** resolved

**Blocked by:** 04, 06

Final spec integration review reproduced pointer exit erasing an active keyboard range preview. Parent spec: keyboard-focused day previews the range (line 126).

- [x] When a draft is open and a day retains keyboard focus, pointer exit restores that focused day's preview rather than collapsing to the start.
- [x] Pointer hover can still preview another date, and completion matches the active focused endpoint.
- [x] Public Calendar regression tests demonstrate red then green; targeted browser recheck and combined lint, unit tests, and TypeScript pass (isolated validation; main integration checks recorded below).

## Comments

- Reproduction: click June 10 → ArrowRight twice → move pointer to header without clicking. June 12 stays focused but loses its preview; Enter still commits June 10–12.
- Coordinator approved ticket 10 and requested integration after ticket 09. Integrated only the `CalendarDayView.tsx` pointer-exit handler and two public `Calendar.test.tsx` regressions via `apply_patch`; ticket 09's controller and tests are preserved. The original pointer-only exit test is unchanged and passes.
- Red → green evidence: before the handler fix, the new regression failed after hovering the header (June 12 retained focus but its accessible preview description was empty). After the fix, hover can override the focused endpoint, pointer exit restores June 12, and Enter completes June 10–12. The second regression confirms that pointer exit clears the preview when focus has left the grid.
- Isolated checks: zero-warning ESLint, all 633 unit tests across 18 files, TypeScript and formatting passed. Chromium rechecked focused preview restoration, hover override, Enter completion, pointer-only exit, and exit after focus leaves; no browser errors.
- Main integration checks: `./node_modules/.bin/vitest run src/components/forms/Calendar/Calendar/Calendar.test.tsx -t 'supersedes an open draft|clears an open draft|preserves a draft and preview on semantically equivalent|restores the focused range endpoint|clears pointer preview on exit|previews both directions across week rows'` — **9 passed, 151 skipped**, covering all six ticket 09 cases, both ticket 10 regressions and the original pointer-only exit test. `./node_modules/.bin/tsc --noEmit` — passed. Main combined checks remain with the coordinator as requested.
- External evidence: `/tmp/opencode/calendar-preview-verification.md`; browser script `/tmp/opencode/verify-calendar-preview.mjs`; screenshot `/tmp/opencode/calendar-preview-restored.png`. No scripts added to the repository; no staging or commits.
