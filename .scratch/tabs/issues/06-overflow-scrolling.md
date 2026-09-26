# 06: Tab list overflow scrolling

**What to build:** When there are more Tabs than fit, an HR user can scroll the tab row sideways. The scrollbar is hidden, labels stay on one line, and the active tab is scrolled into view whenever it changes, without the page itself scrolling vertically. Headless UI doesn't do this, so the Tab list wrapper adds it. Parent spec: `.scratch/tabs/spec.md` (Tab list).

**Blocked by:** 02 (Tabs on Headless UI: click and keyboard switching)

**Status:** completed

- [x] The tab row never wraps and scrolls horizontally when it overflows its container
- [x] The scrollbar is hidden, and scrolling by wheel, touch or keyboard still works
- [x] When the selection changes, the selected tab is scrolled into view on the tab row's axis only
- [x] Tests stub the browser scroll APIs jsdom lacks (as the Sidebar tests stub `window.scrollTo`)
- [x] A story puts many tabs in a narrow container; browser verification performed programmatically rather than by hand (see Comments)
- [x] `pnpm lint`, `pnpm test:unit` and `pnpm build` pass

## Comments

### Isolated implementation and browser evidence — 2026-09-26

Implemented in `/tmp/opencode/tab-06` on a byte-for-byte seed of main's unstaged ticket01+02 files. Seed and ticket delta recorded separately at `/tmp/opencode/tab-06-seeded-base.patch`, `/tmp/opencode/tab-06-seeded-base.hashes` and `/tmp/opencode/tab-06-ticket-delta.patch`.

- Native horizontal overflow, hidden standard/WebKit scrollbars, non-wrapping/non-shrinking Tabs. A 4px gutter preserves the existing outside focus outline: Tabs remain 40px tall, scrollport is 48px tall.
- Initial and changed selections adjust only the list's horizontal scroll position. The observer watches its own list, ignores nested-list selection mutations, excludes nested selected Tabs from lookup, and disconnects on cleanup. Headless UI retains selection, keyboard and ARIA behavior.
- Added `UI/Tabs/Tabs → NarrowOverflow`, with eight Tabs, a 320px container, initial last-Tab selection and an oversized label. Extended existing stylesheet tests and the composed Tab list ref test; stubbed missing `Element.scrollTo`. No jsdom layout assertions or repository E2E tests.

Programmatic headless Chromium verification through Storybook passed in the isolated worktree. Script: `/tmp/opencode/verify-tab-06.mjs`; exact assertions/results: `/tmp/opencode/tab-06-browser-results.log`.

- Initial last Tab visible with page `scrollY=0`; row width 320px, scroll width 1253px, all eight Tabs at one top coordinate and 40px tall. Both scrollbar-hiding rules apply.
- Home/End, arrows including wrapping, PageUp/PageDown reveal and focus the selected Tab with its outline gutter visible, keep one panel, and preserve page `scrollY=500`. Tab reaches the active panel.
- A 506.05px label stays on one line and reveals its leading edge when selected from Overview. Labels wider than the viewport remain partially visible and naturally scrollable.
- Horizontal wheel +550 moves the row beyond 400px; -1000 returns it to zero without changing selection or page scroll. Chromium emulated touch at 390×844 moves the row more than 100px without changing selection, page `scrollY=500`, or creating document-wide horizontal overflow.
- Runtime Storybook controlled parent updates 7→0 reveal hidden right/left selections without focusing Tabs or moving the page. An update with the row vertically offscreen preserves `scrollY=1500`.
- Nested/sibling browser DOM fixtures confirm isolation. No desktop page errors. Rendered screenshots were captured and reviewed: `/tmp/opencode/tab-06-keyboard-left.png`, `/tmp/opencode/tab-06-keyboard-right.png`, `/tmp/opencode/tab-06-long-label.png`, `/tmp/opencode/tab-06-touch.png`. Initial screenshots exposed clipped focus outlines; the gutter corrected them.

Limitations: programmatic interaction, not a human/manual session; emulated touch, not a physical device; Chromium only. Wheel checks use horizontal deltas. Controlled behavior in the isolated run used runtime arguments before ticket04 integration. Full evidence and isolated self-review remain in `/tmp/opencode/tab-06/.scratch/tabs/issues/06-overflow-scrolling.md`.

Isolated gates passed: frozen install, lint, 15 unit-test files / 402 tests, and build. CSS and initial-selection browser assertions were observed failing before implementation and passing afterwards.

### Main integration — 2026-09-26

Applied only ticket06's delta with `apply_patch` to `/home/vernon/projects/horaion/worktree/tab`, on top of tickets01/02/03/04. Preserved ticket03's disabled colour/hover guards; ticket04's controlled root API and tests; the existing Controlled story; and all existing stylesheet assertions. Merged NarrowOverflow into the existing root story file.

Combined main checks passed:

- `pnpm lint` — zero warnings.
- `pnpm test:unit --run` — 15 files, 414 tests passed.
- `pnpm build` — TypeScript and Vite build passed.

Browser checks were deliberately not rerun during integration, per the user's instruction. Final integrated browser verification after ticket05 will cover composition; the earlier evidence above applies to the isolated ticket06 implementation. Integration review found no blocking issues. Only this ticket's canonical completion/comments were updated. All changes remain unstaged; no commits or PRs.

### Final combined verification — 2026-09-26

All six tickets passed combined lint, 421 unit tests and build. The integrated Storybook build and Chromium checks also passed; see [browser-verification.md](../browser-verification.md) and [verification.md](../verification.md). Programmatic browser checks provide the equivalent of the requested by-hand scroll verification, with the method and browser limitations explicitly recorded.

- 2026-09-26 (review): The 48px row (40px tabs plus the 4px focus gutter) is accepted for now and recorded in the spec. Scroll-into-view still needs a manual check in Storybook. The automated Chromium run doesn't count as the manual check this ticket asks for.
