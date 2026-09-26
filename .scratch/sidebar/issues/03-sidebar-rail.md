# 03: Sidebar rail with logo and the five-Module layout

**What to build:** The full Sidebar from the design. It's a full-height Ink Blue rail with the Horaion logo at the top linking home, and a navigation landmark listing Sidebar items. Clicking an item moves the highlight to it, and keyboard users can tab through the logo and every item in order. Storybook recreates the design's mockup for each of the five Modules being active, using the real Horaion icons. Parent spec: `.scratch/sidebar/spec.md` (see "Sidebar module").

**Blocked by:** 01 (Horaion icons), 02 (Sidebar item)

**Status:** completed

- [ ] The Sidebar takes `children` (Sidebar items) and an optional `className`. It has no Module list of its own.
- [ ] It renders a full-height rail 280px wide with an `ink-blue-900` background and 28px horizontal padding.
- [ ] At the top there's a stand-in Horaion logo: the mockup's pie mark (a pie with one quarter pulled out, filled `ink-blue-100`, about 40px, 28px from the top). It's a separate logo component so the real logo can replace it later, wrapped in a router link to `/` with an accessible name.
- [ ] Items sit in a `<nav>` landmark with an accessible label, as a list with 16px vertical spacing, matching `.scratch/sidebar/design/sidebar-mockup.png`.
- [ ] Tests (reusing the in-memory router harness from 02): there's a navigation landmark with its label, the logo is a link to `/` with an accessible name, clicking another item navigates and moves `aria-current="page"` and the active icon, and the tab order is logo then each item.
- [ ] The compiled-stylesheet test is extended so every colour class the Sidebar and the logo render produces CSS.
- [ ] Stories: one story per active Module (Dashboard, Scheduling, Leave, People, Organisation) recreating the mockup with the Horaion outline and filled icons from 01.
- [ ] Code, stories and comments call the five destinations "Modules", as in the glossary.
- [ ] `pnpm lint` (zero warnings), `pnpm test:unit` and `pnpm build` pass.

## Comments

### Implementation verified — 2026-09-25

All acceptance criteria above are verified on `feat/sidebar-icons`, after 01 and 02 were integrated and their combined checks passed.

- Delivered nested Sidebar and HoraionLogo full quads and barrel exports. The children-driven rail has no built-in Module list.
- Tests cover labelled navigation, logo link, active icon/state changes on navigation, keyboard order and compiled rail/logo colour utilities.
- Five Module stories use Horaion icons. Headless Chromium measured the 280px rail, 28px padding, 40px logo, 224×48px items and 16px spacing, and checked colours, hover, active icons, clicks, home navigation, Tab/Shift+Tab, Enter and 2px white focus outlines. Zero browser page errors.
- Standards and spec self-review completed, with no unresolved findings.
- Final combined checks: lint passed with zero warnings; `pnpm test:unit --run` passed (337 tests, 6 files); app and Storybook builds passed. Commands used `--config.verify-deps-before-run=false` with the installed dependencies.
- Browser measurements/screenshots: `/tmp/opencode/horaion-sidebar-03/`; reproduction script: `/tmp/opencode/verify-sidebar-03.mjs`.
- Shared prerequisite findings, approved follow-ups and limitations: see `../verification.md`.
