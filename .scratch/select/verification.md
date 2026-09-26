# Select implementation verification — 2026-09-26

## Result

**Initial browser review found one defect, now resolved:** focused status triggers had no visible focus ring. The final-fix confirmation below closes ticket03. Actual long-list/empty-list review passes, resolving ticket04; multi-select and RHF interactions also pass.

Reviewed integrated Storybook at `http://127.0.0.1:6007`, direct iframe stories `forms-select--<story>`, using headless Playwright Chromium (`executablePath: chromium.executablePath()`), 1000×720 viewport. External script: `/tmp/opencode/verify-select-final.mjs`. Its final run completes interaction/geometry checks with zero browser page errors, then deliberately exits nonzero on the focus-ring findings. Screenshots were inspected directly.

## Actual-story evidence

| Stories | Browser observations |
| --- | --- |
| `LongList` | 30 real React options; 40px rows; panel/max-height **248px**, client height 246px, scroll height 1208px, `overflow-y:auto`. Mouse wheel reached `scrollTop=962`, exposing Department 30; selecting it closed the panel and updated the trigger. |
| `LongList`, below | Trigger `(16,16,200.640625,44)`; panel `(16,64,200.640625,248)`: aligned left edges, exact 4px gap. |
| `LongList`, flipped | Runtime placement of existing trigger only (`left:120px; bottom:12px`): trigger `(120,664,158.609375,44)`; panel `(120,412,158.609375,248)`, bottom 660px: exact 4px upward gap. Options were never cloned or injected. |
| `Multiple` | Two checked Ink Blue 900 icons, one empty Neutral 400 icon; matching `aria-selected` and multi-select ARIA. Toggling through 2→3→2→1→0 keeps the panel open, shows counts, then the single label, then placeholder. Escape closes and returns focus; outside click closes. |
| `MultiplePlaceholder`, `MultipleOneSelected`, `ManySelected`, `CustomSummary` | Respectively “Choose a department”, “Finance”, “3 selected”, “2 departments”. |
| `Success`, `Error` | Correct borders `rgb(52,141,125)` / `rgb(210,72,71)` retained on focus; error alone sets invalid ARIA. **Failure:** focused outline color `rgb(60,153,241)`, width 2px and offset 2px, but style **none**, with no box shadow. There is no visible status focus ring. |
| `Disabled`, `DisabledWithError` | Background `rgb(241,243,248)`, border `rgb(205,206,211)`, text `rgb(176,177,182)`, not-allowed cursor. Disabled error retains invalid ARIA and muted styling. Mouse click does not open; Tab skips trigger. |
| `DisabledOptions` | Disabled selected Finance has Neutral 500 text and Neutral 400 tick. Forced pointer click leaves selection/panel unchanged; Home then ArrowDown skips Finance to Operations, which Enter selects. |
| `EmptyList` | “No options” is a 40px Neutral 500 row with zero option roles; click/ArrowDown/Enter leaves the placeholder unchanged. Callback rejection and custom empty text remain covered by existing jsdom tests. |
| `ReactHookForm` | Empty submit focuses Department and marks both controls invalid. After Finance is selected, invalid submit focuses Departments. Picking People and Operations keeps the multi panel open. Valid submission displays `{"department":"finance","departments":["people","operations"]}`, removes invalid state, and native FormData contains `department=finance`, `departments[0]=people`, `departments[1]=operations`. Invalid focus is real, but its status ring has the same ticket03 visual defect. |

## Reused geometry evidence

Ticket01's unchanged geometry evidence is retained from `/tmp/opencode/verify-select-01.mjs` and its recorded results in `issues/01-select-single-mode.md`: placeholder trigger 200.640625×44px, intrinsic panel width 252.78125px, 4px anchoring gap; FullWidth trigger/panel both 968px; constrained selected-label width 84px against 187px content with ellipsis; white panel, 8px radius, 1px Neutral 400 border, shadow, 4px vertical padding. Prior screenshots: `/tmp/opencode/select-01-{bottom,flip,truncation,scroll}.png`. The old cloned-row scrolling evidence is superseded by the actual `LongList` measurements above.

## Artifacts and remaining constraints

- Current screenshots: `/tmp/opencode/select-final-{long-top,long-bottom,long-flip,multiple,success,error,disabled,disabled-with-error,disabled-options,empty,rhf-errors,rhf-submitted}.png`. Inspected long-bottom/flip, multi, status, disabled-with-error/options, empty and both RHF screenshots.
- Initial follow-up (completed below): fix ticket03's visible status focus ring and rerun browser review. No product files were changed in the initial verification pass.
- Designer signoff remains pending for estimated geometry/styling and states not represented by the supplied mock (single tick, row highlight, disabled, status, empty). Browser measurements establish implementation behavior, not designer approval.
- Spanish native-language review remains pending; this browser pass used English stories.
- Agreed verification remains jsdom tests plus Storybook review. Automation and screenshots live outside the repo; no repository Playwright tests or test seam were introduced.
- The initial browser pass did not close ticket05's combined full-suite checkbox; final combined checks below now do. No staging, commits or pushes.

## Final review resolution — 2026-09-26

- Fixed the invisible outline with `focus:outline-solid`. Focused direct Playwright recheck against the existing port 6007 Storybook: `/tmp/opencode/verify-select-fixes.mjs` **passes**, zero browser page errors. Success, Error, invalid RHF single and invalid RHF multi all compute `outline: rgb(60, 153, 241) solid 2px`, `outline-offset: 2px`. Success border remains `rgb(52, 141, 125)` and Error/RHF border remains `rgb(210, 72, 71)`.
- Disabled and disabled-with-error remain unfocusable, with `outline-style:none` and Neutral 400 borders. The selected disabled Finance option rejects Enter and Space without changing selection. The unchanged geometry, scrolling, empty-list, summary, disabled styling and valid RHF submission evidence above is reused.
- New screenshots: `/tmp/opencode/select-fixes-{success,error,rhf-single,rhf-multi}.png`. The Error screenshot was inspected directly: solid blue ring and separate red status border are visible. These supersede the earlier focus-ring failure evidence; ticket03 is resolved and its focus-ring checkbox is complete.
- Fixed the separate spec-review native-reset defect: callback rejection no longer prevents restoring a disabled default. Headless UI owns uncontrolled state/reset; the options public event boundary prevents disabled keyboard activation using standard ARIA attributes, without generated-ID assumptions or private DOM/data attributes. Disabled click/navigation behavior and multi disabled membership remain covered.
- TDD: disabled-default reset regression failed in single mode before the fix and passes in both modes afterwards; status class assertions failed for both statuses before adding the solid style and pass afterwards. Targeted Select suite **52 passed**, external reset reproduction **1 passed**. Own final checks: **431 unit tests across 10 files passed**, **zero-warning lint passed**, **TypeScript passed**, **changed-TSX Prettier passed**. Ticket05's combined full-suite checkbox is complete.
- The coordinator reran application and static Storybook builds after the fixes; both pass. Designer signoff and Spanish native-language review remain pending as previously recorded. No known unresolved defect from this final-fix pass. No staging, commits or pushes.

## Final combined checks and review

All acceptance criteria in tickets 01–05 are checked and all five tickets are resolved. Integrated on `feature/dropdown` as unstaged changes, against base `7e6ece73731dbc22f0cf6c338523b238b2cda1b8`.

| Check | Final result |
| --- | --- |
| `pnpm lint` | Passed, zero warnings |
| `pnpm test:unit --run` | Passed, 431 tests across 10 files; 52 Select tests |
| `pnpm exec tsc --noEmit` | Passed |
| `pnpm build` | Passed after final fixes |
| `pnpm storybook:build` | Passed after final fixes |
| `git diff --check` | Passed |
| Storybook browser review | Passed, with unchanged evidence reused and targeted fixes rechecked |

- **Standards review:** corrected one low-severity tracker-format finding affecting two ticket files. The optional observation about two duplicated icon-colour expressions was left as-is; it is not a standard violation.
- **Spec review:** fixed native reset restoration of disabled defaults, with a failing-then-passing public-interface regression. The separate browser-found status-outline defect was also fixed and rechecked. No mandatory review findings remain open.
- Build tooling emits non-failing notices: Vite's SWC plugin recommendation, Node's `module.register()` deprecation, Storybook's unused `src/**/*.mdx` glob, and Storybook chunk-size warnings. No tooling/configuration changes were added for these notices.
- No database, service-side security, migration, or concurrent-write checks apply to this client-only control. No credentials or backend access were required. Keyboard, disabled, form, and ARIA behavior were verified at the agreed rendered interface.
- No repository Playwright tests were added or run; direct Chromium automation was used only to review Storybook, as agreed. The sole shared test-environment addition is a minimal `ResizeObserver` stub. The typeahead test supplies jsdom's missing `innerText` locally.

## Prerequisites and skill-discovery evidence

- Node `v26.10.0`, pnpm `12.6.0`, Headless UI `2.2.10`, Vitest `5.0.1`, and Playwright `1.63.0` were available. Dependencies installed successfully from the local pnpm store. Existing manifests and lockfiles were preserved.
- Chromium's executable was present and a headless launch/close smoke passed; browser version `153.0.8010.12`. The later Storybook reviews establish actual rendering and interaction availability.
- All five referenced skills (`implement-spec`, `implement`, `tdd`, `resolving-merge-conflicts`, `code-review`) have readable `SKILL.md` files under `/home/vernon/.claude/skills/`, with matching names/descriptions. Claude Code `2.1.283` is installed. **This is filesystem evidence; Claude Code runtime discovery was not verified.** No dedicated skill-list command was exposed by its help, and no Claude model session was launched for discovery.
- **Codex availability is not established:** no `codex` executable was found on `PATH`; `~/.codex/skills`, `~/.agents/skills`, `/etc/codex/skills`, and checked repository/ancestor skill directories were absent. `CODEX_HOME` and `CLAUDE_CONFIG_DIR` were unset. Plugin/config-provided skill discovery was not audited. Claude skill files do not establish Codex availability.
- OpenCode's supplied runtime inventory listed the five skills; coordinator/implementation/review workflows were loaded or read and followed here. This equivalent workflow allowed implementation to finish without claiming Claude or Codex runtime discovery.

## Execution and cleanup

- Ticket dependency order: 01, then 02/03/04 in isolated parallel worktrees, then 05 after 02 integration. Maximum simultaneous implementation agents: three. Final Standards and Spec reviews were separate and were not duplicated.
- The user's current no-staging/no-commit/no-push instruction superseded the handoff's commit/merge policy. Worktree changes were reviewed and integrated with patches. **No commits were created, no files were staged, and nothing was pushed.**
- Repaired this worktree's stale Git administrative path before creating the isolated worktrees. All five task-created Select worktrees and their temporary branches were removed after integration; the task-created Storybook process on port 6007 was stopped. Other worktrees and processes were preserved.
- Browser scripts/screenshots remain under `/tmp/opencode` as optional local evidence; the checked-in-source report and tests carry the durable results. The read-only `codex-handoff/` snapshot was preserved.

## Remaining follow-ups

1. Designer review of the single-mode tick, active-row Neutral 100 highlight, disabled-option treatment, Success/Error/disabled triggers, and empty row. These implement approved prose decisions absent from the PNG; this is not a claim of designer sign-off.
2. Confirm estimated colour values against Figma if exact values become available; implementation uses existing Horaion tokens.
3. Native-speaker review of Spanish count and empty-state translations.
4. If future execution must use Codex, install/expose its CLI and skills, then verify runtime discovery. Claude Code runtime discovery also remains unverified; this did not block the completed OpenCode workflow.
