# 09: External controlled range updates supersede stale drafts

**Status:** resolved

**Blocked by:** 04, 07

Final spec integration review reproduced an open draft masking a newly supplied controlled range. Parent spec: controlled operation and form submission, lines 150–151.

- [x] A changed controlled range value cancels an earlier draft and its preview, displays/submits the supplied range, and makes the next click begin a fresh draft.
- [x] A changed controlled value of null also cancels a stale draft; equivalent range objects on ordinary parent rerenders preserve an active draft.
- [x] Public Calendar regression tests demonstrate red then green; combined lint, unit tests, and TypeScript pass in isolation. Full combined main verification remains with the coordinator.

## Comments

- Reproduction: controlled null → click June 10 → rerender with June 20–22 → click June 25. Before correction the callback completes June 10–25 and hidden endpoints remain empty after the external update.
- Coordinator reviewed and approved the semantic-key guarded render-time synchronization. Integrated the exact two-file delta via `apply_patch`: `src/components/forms/Calendar/Calendar/Calendar.tsx` (+12 lines) and `src/components/forms/Calendar/Calendar/Calendar.test.tsx` (+188 lines). Existing main story mode controls were preserved.
- Red/green evidence in `/tmp/opencode/calendar-controlled-fix`: the original controller failed four changed-value cases (null→range, start-only change, end-only change, range→null); both equivalent-value rerender cases passed. With the fix, all six pass. Calendar suite: 182 passing tests; full unit suite: 637 passing tests across 18 files; zero-warning lint, TypeScript, and formatting passed.
- Main integration verification: `node_modules/.bin/vitest run src/components/forms/Calendar/Calendar/Calendar.test.tsx -t 'supersedes an open draft|clears an open draft|semantically equivalent'` passed all 6 targeted cases (152 skipped). `node_modules/.bin/tsc --noEmit` passed. Both integrated files exactly matched the reviewed isolated versions immediately after applying the patch. Full combined main checks will be run by the coordinator. No commits made.
