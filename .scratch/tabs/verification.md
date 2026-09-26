# Tabs and Count badge implementation verification

Date: 2026-09-26. Result: **completed** — all six approved tickets integrated as unstaged changes in `feature/tab`.

## Implemented scope

- Standalone CountBadge: zero/undefined omission, numeric display capped at `99+`, three tones, native span props, stories and tests.
- Five nested Tabs parts wrapping Headless UI: index-based controlled/uncontrolled selection, automatic keyboard activation, accessible naming and ordered panel pairing, disabled Tabs, counts and horizontal overflow.
- Headless UI moved from development to runtime dependencies, with the pnpm lockfile updated.
- Full component/story/test/barrel sets, data-state styles, compiled-stylesheet coverage and canonical ticket completion notes.

## Prerequisites and handoff validation

| Prerequisite | Finding |
| --- | --- |
| Checkout | Started clean at `db11856bca7ad7bef5e550e1c1389087a23542dc`, matching the snapshot. |
| Dependencies | Node `v26.10.0`, pnpm `12.6.0`; `pnpm install --frozen-lockfile` succeeded. Headless UI `2.2.10`. |
| Database | Not required: these are standalone client UI primitives; no database, backend, migration, authenticated service or credential dependency is in the approved scope. |
| Browser | Playwright Chromium `153.0.8010.12` launched successfully. Actual Storybook stories were exercised programmatically. |
| Claude Code skills | Filesystem evidence: all four skill folders are present under `~/.claude/skills/`. Separate **runtime** evidence: Claude Code `2.1.283` startup `system/init.slash_commands` listed `implement-spec`, `implement`, `tdd` and `code-review`. The discovery-only process was stopped after obtaining that event. |
| Codex skills | `codex` was not found on `PATH`. No `SKILL.md` was found under `~/.codex` or `~/.agents`; the project has no `.agents` directory. Installation/discovery in Codex could not be confirmed. Handoff snapshots are readable files, not evidence of Codex runtime discovery. |
| Equivalent workflow | OpenCode loaded the handoff skill copies by reading them and followed their orchestration, TDD and two-axis review workflows. OpenCode availability was not used to claim Codex availability. |
| Worktrees | Six isolated ticket worktrees were created successfully under `/tmp/opencode/tab-01` through `tab-06`. Existing stale/prunable worktree metadata was neither pruned nor repaired. |
| Component inventory | Searched components and features before implementation; no equivalent Tabs/CountBadge existed. Only the six already-approved components were created. |

## Execution and integration

Dependency order: **01 + 02**, then **03 + 04 + 06**, then **05** after 01/03. Peak implementation concurrency was three agents; final verification used two review agents and one browser agent. Each implementation agent owned one ticket in its own worktree.

The user prohibited staging, commits and pushes. Therefore successor worktrees were seeded from the verified unstaged predecessor files, and ticket-only deltas were integrated with `apply_patch`, rather than committing/merging branches. No PR was opened. Checks ran after meaningful integrations, and the final combined checks below cover all six tickets.

Headless UI already supplied first-enabled initial selection and callback suppression for re-clicking selected or disabled Tabs. No wrapper correction or duplicated keyboard/selection implementation was necessary. A documented test-local correction makes jsdom's disabled-button `focus()` match native Chromium; integrated native-browser keyboard checks independently verify the real behavior.

The overflow row includes a 4px focus-outline gutter discovered during browser checks. Tabs remain 40px tall; the scrollport is 48px tall. Its reveal logic changes only horizontal row scrolling.

## Final combined checks

| Check | Result |
| --- | --- |
| `pnpm lint` | Passed, zero warnings |
| `pnpm test:unit --run` | **421 tests passed across 15 files** |
| `pnpm build` | Passed, TypeScript and Vite |
| `pnpm storybook:build` | Passed |
| Integrated Chromium stories | All **16** relevant stories load; **0 page errors, 0 console errors** |
| Repository whitespace/index checks | `git diff --check` passed; index empty; HEAD unchanged |

`--run` makes the repository's watch-oriented `test:unit` script terminate. Ticket comments record targeted checks and red/green evidence. The final [browser report](browser-verification.md) records exact state colours, native disabled navigation, controlled parent updates, initial/changed overflow selection, focus outlines and unchanged page scroll at 500px and 1500px. Earlier unchanged wheel, emulated-touch and oversized-label evidence was reused. No repository E2E suite was added; the spec excludes it.

No database or security-sensitive application paths changed. Repository review found only the approved UI, tests, dependency classification and local documentation changes. Required behavior is verified without live services.

## Final two-axis review

### Standards

**0 documented-standard violations.** One low-priority judgment: CountBadge's explicit tone colours and Tab's group-data tone overrides duplicate the active/disabled colour definitions (`CountBadge.tsx:13–17`, `Tab.tsx:25–29`). Computed colours and state precedence pass browser checks. This is a nonblocking maintainability follow-up, not a current defect; no new abstraction was introduced to address it.

### Spec

**0 findings.** All six tickets' behavior, types, stories, compiled styles and dependency requirements match the spec.

The requested local `development` ref is absent. Available `origin/development` resolves to `d9d8454ab329d83b711ffd90b30672420a1be622`; its merge-base with HEAD is `8c8d5dccb0bc5ff85aa085ae4cc963c3eee86280`. That branch comparison includes the older scaffold, Button, Sidebar and Input commits, and omits the unstaged implementation. Review therefore used the task baseline `db11856` plus direct inspection of the new, untracked component trees. Earlier unrelated modules were not re-reviewed. Remote refs were not refreshed.

## Limitations and follow-ups

- **Codex discovery remains unverified.** To establish it, make Codex available with these four skills in its configured discovery paths and inspect its runtime skill listing. This did not block the equivalent OpenCode implementation.
- Browser verification was headless Chromium, not a human/manual session. Touch used emulation; Firefox, WebKit and physical input devices were not checked.
- No original eight-tab design image/label list was supplied; stories use representative labels and the approved dimensions/colours. Provisional design values remain as specified.
- Consider consolidating Count badge state-colour ownership when its design or reuse requirements change.
- At future branch integration, check the sibling branches for duplicate Headless UI dependency moves and competing ADR `0001` numbers, as the handoff warned. Those branches were untouched.
- Storybook build emitted nonblocking warnings for a Node deprecation, no matching MDX files and large chunks. They did not prevent the build.
- All six temporary ticket worktrees were removed after successful integration and final checks. Canonical completion notes and browser results are preserved here; raw browser scripts/logs/screenshots under `/tmp/opencode` are ephemeral. Existing worktrees and their metadata were left alone.
