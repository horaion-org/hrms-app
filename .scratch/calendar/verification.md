# Calendar implementation verification — 2026-09-26

## Result

Approved tickets 01–08 are complete. Final integration review found two defects, recorded and resolved as tickets 09–10. The shared Calendar and Button icon variant are integrated as unstaged changes on `feature/calendar`, based on `067e902`. No dependency, manifest, or lockfile changes were needed.

The Calendar supports ISO single dates and inclusive Date ranges; localized days, months and fixed twelve-year blocks; bounds and disabled dates; roving keyboard navigation; native forms/reset and React Hook Form focus. All approved component file sets and Storybook examples exist. Only Calendar and its public types are exported from the public barrel.

## Combined verification

| Check | Final result |
| --- | --- |
| `pnpm lint` | Passed, zero warnings |
| `pnpm test:unit --run` | Passed: **639 tests across 18 files** |
| `pnpm exec tsc --noEmit` | Passed |
| `pnpm build` | Passed after both integration fixes |
| `pnpm storybook:build` | Passed after both integration fixes |
| Prettier, Calendar and Button folders | Passed after formatting-only cleanup |
| `git diff --check`, including separate untracked-file checks | Passed |
| Integrated static Storybook in Chromium | Passed; zero page errors |

Public Calendar tests cover date arithmetic (including leap centuries), controlled/uncontrolled values, en/es language changes, normalized/restarted/draft ranges, bounds, all keyboard views, focus/ref routing, hidden inputs, reset, and RHF/Zod error focus and valid submission. Every public Calendar story is exercised through `composeStories`; Months, Years and Draft range run their play setup, and React Hook Form is tested through its composed story. Mode/min/max controls are explicitly provided. Helpers have no separate test seam; nested component tests stay thin.

Application and Storybook builds emit existing non-failing notices: SWC plugin recommendation, Node `module.register()` deprecation, an unused MDX glob, and large Storybook chunks. These do not require changes within this feature.

## Browser review against the mock

Reviewed the actual static Storybook on `http://127.0.0.1:6031` using headless Chromium, a 1000×900 viewport, and fixed June 10, 2026 time. Script: `/tmp/opencode/verify-calendar-final.mjs`. Screenshots: `/tmp/opencode/calendar-final-*.png`. The script and images remain outside the repository, as agreed.

| Story / state | Measured and observed evidence |
| --- | --- |
| Days | Panel **288×330px**, white background, 1px Neutral 300 border, 6px corner radius. Day cells **36.28×36px**; seven Monday-first column headers and 42 cells. The extra sixth week is the approved departure from the mock's five-week June. |
| Selection / today | Ink Blue 900 background `rgb(35,74,158)`, white text, 4px radius. Today is separately underlined and has `aria-current="date"`. |
| Weekend / outside month | Weekend text `rgb(60,153,241)`; neighboring-month text `rgb(205,206,211)`. Both inspected in screenshots. |
| Hover / pressed | Actual pointer hover is Porcelain 50 `rgb(239,235,232)`; mouse-down is Porcelain 500 `rgb(118,86,67)`. |
| Months / Years | Four columns and three rows, **54.5×36px** cells. June and 2026 have Ink Blue selection. Year title is `2015 - 2026`. Drilling and keyboard picks preserve focus and navigate without selecting a date. |
| Range | Continuous Ink Blue 50 band `rgb(228,242,253)` with no gap between neighboring columns, continuing across Sunday/Monday rows. Ink Blue endpoints and rounded outer corners. Inspected screenshot. |
| Disabled range | June 11 keeps muted Neutral text inside the blue band between June 10 and June 12. |
| Limits / disabled years | Previous-page button disabled at minimum; keyboard PageUp stops at the bound. Disabled years are muted and retain ARIA state. Inspected screenshot. |
| Keyboard | Arrow/End/PageDown movement, Enter selection, matching drill focus, and range completion passed. Day focus and header icon focus have solid 2px outlines. |
| Icon button | **36×36px**, transparent. Hover computes Ink Blue 700 `rgb(49,121,208)`; keyboard focus is visibly outlined. |
| Spanish | `junio 2026`, Spanish full-date names and weekday labels; Monday remains first. Inspected screenshot. |
| React Hook Form | Invalid submission focuses required single Calendar, then required range. Valid submission renders `{"date":"2026-06-10","range":{"start":"2026-06-11","end":"2026-06-12"}}`. |

Days, Months, Years, range, disabled-year and Spanish screenshots were inspected directly alongside the supplied PNG. Measured colors use existing repository tokens; the browser review is not a claim of pixel-exact Figma approval.

## Review and corrections

### Standards

No mandatory standards findings. One optional repeated-switch observation: the controller maps the three views to paging units, labels and title functions in several places. A view-configuration map could consolidate these, but no speculative refactor was added. Approved inventory, nested file sets, public export boundary, reuse and test seam were confirmed.

### Spec

Two concrete integration defects were reproduced and fixed:

1. **Ticket 09:** external controlled-range changes previously left a stale draft masking the new value and form fields. Semantic endpoint comparison now cancels the old draft/preview on a changed controlled value, while equivalent new object instances preserve an ongoing draft. Six public regressions cover null/range changes, either endpoint changing, and equivalent parent rerenders. Four changed-value cases failed before correction and passed afterward.
2. **Ticket 10:** pointer exit previously erased a range preview despite a day retaining keyboard focus. Exit now restores the actually focused day's preview. Two public regressions cover hover override/restoration, completion and leaving after focus moves away. The final integrated browser run hovers another endpoint, moves onto the header without clicking, verifies the focused endpoint is restored, and completes that range successfully.

Both fixes were reviewed before integration and passed final combined checks. No mandatory findings remain. Runtime mode-switch reset semantics are unspecified; no additional policy was introduced solely for that optional observation.

## Prerequisites and skill discovery

- Node **v26.10.0**, pnpm **12.6.0**, Vitest **5.0.1**, Playwright **1.63.0**. Dependencies were available from the local pnpm store. Chromium, Firefox and WebKit each passed an actual headless launch/close check. The visual/interaction review used Chromium.
- No database, backend service, migration, server-side security or concurrent database-write checks apply to this client-only component. Date blocking, form output and overlapping UI interactions were verified at the public rendered seam. No credentials were required.
- All six handoff skill files are readable at `~/.claude/skills/{implement,tdd,code-review,codebase-design,diagnosing-bugs,domain-modeling}/SKILL.md`. **This establishes filesystem availability only.**
- Claude Code is installed. A noninteractive runtime probe with the Skill tool enabled reported `tdd`, `code-review`, `codebase-design`, `diagnosing-bugs` and `domain-modeling` in its available-skills list, but did **not** report `implement`. This is a runtime model inventory report, not an independently audited loader manifest; the omission does not prove that its readable file is uninstalled. An earlier probe with tools disabled could not establish any skill discovery and is not used as missing-skill evidence.
- **Codex runtime discovery could not be verified:** no `codex` executable is on PATH, and `~/.codex/skills` and `~/.agents/skills` do not exist. Other plugin or custom configuration paths were not exhaustively audited. Claude/OpenCode availability does not establish Codex discovery.
- OpenCode's provided inventory listed the six skills. Applicable instructions were loaded or read and used here: TDD at the approved public seam, coordinator integration, independent final Standards/Spec reviews, and date-helper design. Domain vocabulary was read without editing the model. The no-commit instruction superseded the implementation skill's commit step.

## Execution and repository safety

- Dependency order: 01 → 02 → parallel 03/04 → parallel 05/06/07, integrated 06 → 05 → 07 → coordinator verification 08. Follow-up 09/10 were developed independently and integrated sequentially. Peak concurrent implementation agents: **three**, below the cap of five.
- Overlapping implementation work used separate detached worktrees. During ticket05 seeding, temporary worktrees unexpectedly disappeared due to activity outside this task's tool calls. The already integrated main code remained intact. Fresh worktrees were seeded from the verified 01–04 state and execution resumed.
- Agent worktrees sometimes used symlinked dependencies; pnpm rejected that layout in some runs. Equivalent installed binaries were used there, and the final main checks used the requested pnpm commands successfully.
- No files were staged, no commits were created, and nothing was pushed. Pre-existing `CONTEXT.md`, ADR and spec/design work was preserved. The handoff snapshots were not edited or removed. No repository Playwright tests were introduced.

## Remaining human review and optional follow-ups

1. **Designer sign-off pending:** today marker, range band/endpoints, disabled year cells and icon-only button hover, as required by the handoff.
2. **Spanish native-speaker review pending.** Automated localization behavior passes.
3. If execution must occur in Codex, expose/install its runtime and skills and verify actual discovery. Claude Code's `implement` discovery discrepancy also remains to be investigated in that harness.
4. Optional maintainability follow-up: consolidate existing view-to-label/paging mappings if future view changes justify it. This is not a completion blocker.
