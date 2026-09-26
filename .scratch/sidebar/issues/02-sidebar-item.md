# 02: Sidebar item as a router-driven navigation link

**What to build:** A single Sidebar item takes a user to a Module. It shows an icon and a label, darkens on hover, and switches to a light fill with a filled icon when its route is the current location. Screen readers announce it as the current page when it's active. The router decides whether the item is active, so callers never pass an active flag. Parent spec: `.scratch/sidebar/spec.md` (see "Sidebar module").

This ticket also sets up the in-memory TanStack Router test harness (memory history plus sample routes) that ticket 03 reuses. That harness is the spec's only new kind of test seam.

**Blocked by:** None (can start immediately). Tests and stories use Heroicons as stand-in icons. The `icon` and `activeIcon` props accept any `Heroicon`-typed component, so the Horaion icons from 01 fit later without any changes.

**Status:** completed

- [ ] A Sidebar item takes `to` (typed through TanStack Router's link props), `label`, `icon` and `activeIcon`, and passes other link props through.
- [ ] It renders TanStack Router's `Link`. The router's active matching sets `aria-current="page"` and chooses `activeIcon` over `icon`.
- [ ] Default: transparent background, white label and icon. Hover: `ink-blue-800` background. Active: `ink-blue-100` background, `neutral-900` label, active icon in `ink-blue-900`, and hovering doesn't change it. Focus-visible: a 2px white outline with an offset, in every state.
- [ ] It's 224×48 with slightly rounded corners, 16px inner padding, a 20px icon, a 12px gap between icon and label, and 16px label text, matching `.scratch/sidebar/design/sidebar-mockup.png`.
- [ ] The accessible name is the label alone. The icon is hidden from assistive technology.
- [ ] It sits in the shared layout area as a nested Sidebar item folder with the full component quad, exported through the Sidebar barrel.
- [ ] Tests (through the in-memory router harness): the item matching the location has `aria-current="page"` and shows the active icon, an item that doesn't match has neither, the label is the accessible name, the icon is hidden, and extra link props pass through.
- [ ] The existing compiled-stylesheet test is extended so every colour class the Sidebar item renders, in both its active and inactive states, produces CSS.
- [ ] There are stories for default, hover and active, using an in-memory router.
- [ ] `pnpm lint` (zero warnings), `pnpm test:unit` and `pnpm build` pass.

## Comments

### Implementation verified — 2026-09-25

All acceptance criteria above are verified on `feat/sidebar-icons`.

- Delivered `src/components/layout/Sidebar/SidebarItem/` with its full quad and barrel, plus reusable `createMemoryRouter` and `MemoryRouterHarness` helpers documented in `src/common/README.md`.
- The public `to` remains registered-route typed; real Link props, refs, active/inactive props and router-driven matching are covered. Sample Module destinations use registered `/` and `/example` routes with search values.
- Tests cover accessible names, decorative icons, active state/icon selection, navigation, search/hash matching and prop forwarding. Compiled Tailwind coverage collects both states, including SVG classes.
- Browser checks verified Default/Hover/Active stories, dimensions, colours, active-hover stability and white focus outline.
- Standards and spec self-review completed, with no unresolved findings. Integrated with 01 before 03 began.
- Final combined checks: lint passed with zero warnings; `pnpm test:unit --run` passed (337 tests, 6 files); app and Storybook builds passed. Commands used `--config.verify-deps-before-run=false` with the installed dependencies.
- Shared prerequisite findings and limitations: see `../verification.md`.
