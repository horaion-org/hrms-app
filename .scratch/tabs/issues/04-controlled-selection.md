# 04: Controlled tab selection

**What to build:** A developer can control which Tab is selected, for example to sync it to a URL search param, by passing `selectedIndex` and `onChange(index)` to Tabs. Uncontrolled use with `defaultIndex` keeps working. Parent spec: `.scratch/tabs/spec.md` (Tabs root, Selection callbacks).

**Blocked by:** 02 (Tabs on Headless UI: click and keyboard switching)

**Status:** completed

- [x] When `selectedIndex` is given, it decides the selected tab and panel
- [x] `onChange` fires with the new index when a click or key changes the selection
- [x] `onChange` doesn't fire when the already-selected tab is clicked again. If Headless UI fires it anyway, the wrapper filters it out
- [x] In controlled mode, the selection doesn't change unless the parent updates `selectedIndex`
- [x] In uncontrolled mode, `onChange` still fires on each change
- [x] A controlled story shows the selected index outside the tabs
- [x] `pnpm lint`, `pnpm test:unit` and `pnpm build` pass

## Comments

### 2026-09-26 — Ticket 04 completed in isolation

- Implemented in `/tmp/opencode/tab-04` on the verified, unstaged 01+02 seed
  from `/home/vernon/projects/horaion/worktree/tab`. The Tabs and CountBadge
  trees, stylesheet test, package manifest and lockfile were seeded with
  read/apply_patch and verified byte-for-byte before implementing 04.
  Baseline record: `/tmp/opencode/tab-04-base.md`.
- Ticket 04 delta is limited to `Tabs/Tabs.tsx`, `Tabs/Tabs.test.tsx`,
  `Tabs/Tabs.stories.tsx` within `src/components/ui/Tabs/`, and this ticket.
  Work is unstaged and has not been integrated into main.
- Exposed `selectedIndex?: number` and `onChange?: (index: number) => void`.
  Updated the prior controlled-API type exclusions; manual, vertical,
  polymorphic and value-based APIs remain excluded.
- TDD at the composed Tabs public seam: the initial typecheck failed because
  the controlled props were absent, while the runtime test already passed
  through Headless UI. Adding the two public props made the typecheck green.
  Tests cover click and keyboard indexes (arrows, Home/End, PageUp/PageDown),
  parent-owned selection until rerender, no callback on parent updates,
  reselecting the current Tab or clicking a disabled Tab in either mode,
  and uncontrolled callbacks with `defaultIndex` and wrapping.
- **Library callback finding:** Headless UI 2.2.10 compares the requested
  index to the current controlled/uncontrolled index before calling
  `onChange`. Tests confirm re-clicking the selected Tab does not notify,
  including after the parent accepts a new index. Disabled clicks also do
  not notify. No wrapper filtering or custom selection state is needed.
- The controlled story owns state in its render function and displays the
  zero-based index outside Tabs using the existing read-only `Input`.
  No new shared or feature components were created.
- Exploratory note for disabled-navigation integration: jsdom 30.1.0 allows
  `.focus()` on a native `<button disabled tabindex="-1">`, reproduced
  without React. An exploratory disabled-arrow case consequently requested
  the disabled index through Headless UI. Ticket 04 retains disabled-click
  callback coverage; disabled keyboard navigation belongs to ticket 03.
  No global focus shim or disabled-navigation implementation was added here.
- Checks passed: `pnpm install --frozen-lockfile`, `pnpm lint` (zero warnings),
  `pnpm test:unit --run` (15 files, 412 tests), `pnpm build`, targeted
  typechecking and Prettier checks. Self-review against the seeded baseline,
  ticket/spec and component conventions found no outstanding ticket 04
  standards or spec issues.

### 2026-09-26 — Integrated on request

- Applied only the ticket 04 root component, root tests/stories and this
  canonical ticket to `/home/vernon/projects/horaion/worktree/tab` using
  apply_patch, preserving the existing 01/02/03 work. Changes remain unstaged.
- Main checks passed: targeted Tabs tests (5 files, 23 tests),
  `pnpm exec tsc --noEmit`, `pnpm lint` (zero warnings), and `git diff --check`.
- Full suite/build deferred until ticket 06 integration, as requested.
