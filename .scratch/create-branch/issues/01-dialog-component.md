# 01: Dialog: generic Headless UI dialog

**What to build:** A generic **Dialog** in `src/components/ui/Dialog` built on Headless UI `Dialog` (app ADR-0001), matching the create-branch mock: a 560 px panel with a 16 px radius over a dimmed backdrop. It has a header with title, description and a × close button, a body, and a footer slot, with Neutral 200 rules between the sections. Parent spec: `.scratch/create-branch/spec.md` (D2, D9).

**Blocked by:** none

**Status:** ready-for-human

- [x] Props: `open`, `onClose`, `title`, `description?`, `children` (body), `footer?`, `preventClose?`, `className?`. Named export, `FunctionComponent` return type, one folder with four files.
- [x] Role `dialog` with `aria-modal`, named by the title and described by the description.
- [x] Esc, a backdrop click and × call `onClose`. When `preventClose` is true, all three do nothing and × is disabled.
- [x] Focus is trapped inside while open and returns to the element that opened it on close.
- [x] The body scrolls when content is taller than the viewport. The header and footer stay visible.
- [x] × has the translated accessible name `dialog.close` (English and Spanish).
- [x] Only existing colour tokens are used.
- [x] Stories: default (the mock's Create branch shell), a long scrolling body, and `preventClose`.
- [x] Unit tests cover the accessible name and description, Esc, ×, `preventClose`, and focus return.
- [x] `pnpm lint` and `pnpm test:unit` pass (full-suite verification owned by parent).

## Comments

- Implemented the four-file Dialog folder and exported `Dialog` / `DialogProps`; props match the ticket. Title/description are strings, body/footer are React nodes. Headless UI owns focus, Escape/outside dismissal, portal and ARIA wiring; `preventClose` guards dismissal and disables the shared icon Button.
- Uses `t('dialog.close')`; English/Spanish translation entries were requested from and added by the feature worker. This worker did not edit translation JSON.
- TDD evidence: first interface test failed on missing export; close-button test failed before close action existed; busy-dismissal test failed before the guard. Final targeted run: Dialog 4 tests + Button 18 tests, all 22 passed. Logs: `/tmp/horaion-dialog-{red,close-red,prevent-red}.log`, `/tmp/horaion-components-tests.log`.
- Owned ESLint command passed with zero warnings: `pnpm exec eslint --max-warnings 0 src/components/ui/Dialog src/components/ui/Button`. TypeScript check has no owned-file errors; concurrent feature `api.test.ts` still awaited its `searchCompanyMembers` implementation at this check.
- Parent browser verification: desktop panel 560 px; at 390 px viewport panel 358 px, x=16; long body at 640 px viewport panel 608 px, scrolling body clientHeight 370 / scrollHeight 1464, footer bottom 624. Prevent-close Escape passed, zero page errors. Parent screenshots: `.scratch/create-branch/design/dialog-browser-default.png` and `dialog-browser-mobile-long.png`. Root changed to `fixed inset-0` after parent observed a zero-size role element.
- Additional parent browser checks passed: backdrop closes the default Dialog; backdrop and Escape cannot close the `preventClose` story. Evidence log: `/tmp/horaion-create-branch-story-checks.log`.
- Standards/spec review completed locally without additional agents: existing Button/Icon reused; no dependencies, unsafe TS escapes, network contract changes, commits or snapshot edits. API unaffected by this generic UI ticket. Final global checks and snapshot regeneration remain with parent.

### Parent final integration verification

- All app checks pass: ESLint zero warnings, Vitest **73 files / 1186 tests** (bounded `--maxWorkers=2`), production TypeScript/Vite build, Storybook production build, and **48 Playwright tests** across Chromium, Firefox and WebKit (two workers). No timeout/configuration relaxation. See `../verification.md` for limits and API evidence.
