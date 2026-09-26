# 04: Select: empty and long lists

**What to build:** When a Select has no options, opening it shows a "No options" message instead of an empty panel. A developer can replace the message with `emptyText`. Long lists scroll inside the panel instead of spilling down the page. Parent spec: `.scratch/select/spec.md`.

**Blocked by:** 01 (Select: single mode, end to end)

**Status:** resolved

- [x] With an empty `options` array, the open panel shows one row with Neutral 500 text that can't be selected: a translated "No options" by default, or `emptyText` when given.
- [x] The English and Spanish translations gain the no-options message under the `select` group. If ticket 02 has landed, merge with its keys rather than overwriting them.
- [x] Picking or pressing Enter in an empty panel calls no `onChange`.
- [x] Storybook has an empty-list story and a long-list story (for example, 30 options) that shows the scroll cap after about 6 rows, for manual review of scrolling and flip positioning.
- [x] Unit tests cover the default empty message, the `emptyText` override, and no `onChange` for an empty list.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

- Implemented ticket04 in `/tmp/opencode/select-04`, branch `agent/select-04`, over the seeded ticket01 snapshot. Extended the existing approved Select file set after inventory search.
- Added `emptyText` and `select.noOptions`: English "No options", Spanish "No hay opciones". The empty row is 40px tall with Neutral 500 text and has no option role.
- Source public-interface TDD verified both locales, override text and no callback after clicking the empty row or pressing ArrowDown/Enter. Source checks: 18 targeted tests, 397 full unit tests across 10 files, TypeScript, zero-warning lint, Prettier and whitespace checks passed.
- Added `EmptyList`, `LongList` (30 actual options), and the `emptyText` control. Preserved ticket01's anchoring, scroll cap and Storybook source-injection workaround.
- **Browser review completed 2026-09-26:** the actual `LongList` story's 30 React options now verify scrolling and upward flip; see final browser evidence below. No new Playwright tests were added.

### Integration verification — 2026-09-26

- Merged into main alongside tickets01+02+03 using `apply_patch`. Both locale `select` groups retain `selectedCount_one`, `selectedCount_other` and `noOptions` together.
- Preserved the multi-aware Storybook renderer and all existing multi stories. Reused the current test i18n instance and reset its language before each test. Empty-panel click/keyboard rejection now covers both single and multi mode.
- Integrated verification: targeted Select suite 43 passed; TypeScript passed; full unit suite 422 passed across 10 files; final lint passed with zero warnings; Prettier and `git diff --check` passed. Initial lint found one component prop-order issue, corrected before the passing final lint run.
- Work remains unstaged and uncommitted. The integration checks above are supplemented by the final browser review below.

### Final browser verification — 2026-09-26

- Actual Storybook `LongList` at port 6007, Chromium 1000×720: 30 options; 40px rows; panel height/max-height 248px; client height 246px; scroll height 1208px; mouse-wheel scroll reached 962px. Picking Department 30 updated the trigger and closed the panel.
- Moving only the existing trigger to `left:120px; bottom:12px` produced an upward panel at `(120,412)` with height 248px, bottom 660px, and trigger top 664px: exact 4px gap. No cloned rows or injected options.
- Actual `EmptyList`: “No options”, 40px Neutral 500 row, zero option roles, and unchanged placeholder after click/ArrowDown/Enter.
- Ticket04 browser requirements pass; marked resolved. Script `/tmp/opencode/verify-select-final.mjs`, screenshots and measurement details in `.scratch/select/verification.md`. That broader review identified a separate ticket03 focus-ring failure; it does not affect these empty/long-list checks.
