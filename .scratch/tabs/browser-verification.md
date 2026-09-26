# Final integrated Tabs browser verification

Date: 2026-09-26. Result: **PASS**.

## Method and scope

- Programmatic Playwright verification in headless Chromium **153.0.8010.12**, viewport 1000×720. These were not manual browser checks.
- Ran against the integrated worktree `/home/vernon/projects/horaion/worktree/tab`, using its main `.storybook` configuration and actual stories.
- External script: `/tmp/opencode/verify-tab-integrated.mjs` (created with `apply_patch`). Run with `node /tmp/opencode/verify-tab-integrated.mjs`.
- Structured results: `/tmp/opencode/tab-integrated-browser-results.json`.
- Storybook dev log: `/tmp/opencode/tab-integrated-storybook.log`.
- Script starts Storybook via a Node subprocess on a dynamically selected free localhost port. Final run used port **33969**. Both the initial run on 39947 and the final run shut down their launched process groups; endpoint shutdown was verified. The second run corrected the verification script's CountBadge story-title filter and included the intentionally empty Zero story.
- Only repository evidence was added; no source/test edits, staging, commits, or agents were used. Previously reported lint, 421 unit tests, and app build were not rerun.

## Fresh integrated assertions

### Story loading

All **16** relevant stories loaded with no Storybook error display:

- `ui-count-badge--active`, `--inactive`, `--disabled`, `--zero`, `--capped`.
- `ui-tabs-tab--inactive`, `--hover`, `--disabled`.
- `ui-tabs-tablist--default`, `ui-tabs-tabpanel--default`, `ui-tabs-tabpanels--default`.
- `ui-tabs-tabs--eight-tab-row`, `--starting-index`, `--counts`, `--narrow-overflow`, `--controlled`.

The Zero story reached Storybook's rendered state with an empty root as intended; all other roots were nonempty, and every Tabs story exposed a visible tablist.

### Counts and disabled keyboard navigation

Actual `Counts` story assertions:

- Approved's accessible name is `Approved 99+` for count 150.
- Archived is a natively disabled button. Zero-count Rejected and undefined-count Overview contain no badge span.
- Initial Pending selection, click on Approved, ArrowRight to Rejected, ArrowLeft to Approved, and Home to Pending produce the exact computed badge colours below. Disabled Archived retains its disabled colours throughout.

| Tone | Computed background | Computed text |
| --- | --- | --- |
| Active | `rgb(35, 74, 158)` | `rgb(255, 255, 255)` |
| Inactive | `rgb(237, 238, 243)` | `rgb(80, 81, 86)` |
| Disabled | `rgb(241, 243, 248)` | `rgb(205, 206, 211)` |

- Native Chromium ArrowRight/ArrowLeft skip disabled Archived in both directions.
- Home selects/focuses Pending; End selects/focuses Overview; ArrowRight wraps to Pending; ArrowLeft wraps to Overview.
- Each checked selection has exactly one visible active panel. Tab from the selected row focuses that panel, with no jsdom focus-boundary workaround.

### Actual controlled parent

In the existing `Controlled` story, the readonly parent index textbox changes with the tab selection:

1. Initial index **0**.
2. Click Employment → **2**.
3. ArrowRight → Compensation, **3**.
4. End → Activity, **7**.
5. Home → Overview, **0**.

Selection, focus and single active panel were asserted at each interaction. This exercises the story's real React `useState` / `onChange` parent, rather than relying on Storybook args as a substitute.

### Overflow, controlled changes and page scroll

In the existing 320px `NarrowOverflow` story:

- Initial `defaultIndex=7` selects Activity; the row genuinely overflows and is scrolled right. The selected tab plus 4px outline allowance is horizontally visible; page `scrollY=0`.
- A browser-only fixture makes the document 2400px tall and positions the story lower down. Starting at `scrollY=500`, Home and End reveal and focus Overview/Activity at opposite ends while preserving exactly `scrollY=500`.
- Both end tabs have a computed **2px solid outline**, **2px offset**, colour `rgb(60, 153, 241)`. Outline bounds fit inside all four scrollport edges (1px rounding tolerance). Screenshot inspection also shows complete outlines at both ends.
- After Tab focuses the panel, Storybook args update the integrated `selectedIndex` to **0 → 7**. Both selections become horizontally visible without focusing either tab or changing `scrollY=500`.
- With the row vertically offscreen at `scrollY=1500`, external selections **0 → 7** remain horizontally visible and preserve exactly `scrollY=1500`.

## Screenshots

- Counts after keyboard Home: `/tmp/opencode/tab-integrated-counts-keyboard.png`.
- Actual controlled parent after returning to index 0: `/tmp/opencode/tab-integrated-controlled-parent.png`.
- Overflow left focus outline: `/tmp/opencode/tab-integrated-overflow-left.png`.
- Overflow right focus outline: `/tmp/opencode/tab-integrated-overflow-right.png`.

## Reused earlier overflow evidence

Read and reused `/tmp/opencode/verify-tab-06.mjs` and `/tmp/opencode/tab-06-browser-results.log` for unchanged overflow behavior. That run records **18 passing checks**, no page errors, a 320px row with 1253px scroll width, and single-row 40px tabs.

Prior-only evidence includes native horizontal wheel scrolling both ways; Chromium-emulated touch swipe; oversized single-line label leading-edge alignment; PageUp/PageDown; nested/sibling mutation isolation; nowrap/nonshrinking tabs and hidden scrollbar rules. These cases were not rerun in the final integrated pass. Its initial selection, selected visibility, controlled external updates, vertical-scroll and focus-boundary assertions were reused/adapted for the fresh integrated pass above.

Prior screenshots: `/tmp/opencode/tab-06-keyboard-left.png`, `/tmp/opencode/tab-06-keyboard-right.png`, `/tmp/opencode/tab-06-long-label.png`, `/tmp/opencode/tab-06-touch.png`. The earlier script's note that ticket04 typing was not yet integrated applies only to that earlier run; the final controlled story was freshly verified above.

## Combined Storybook build

Ran **`pnpm storybook:build` exactly once** in this verification session: exit **0**, `Storybook build completed successfully`, output `storybook-static`.

Log: `/tmp/opencode/tab-integrated-storybook-build.log`.

Nonblocking build warnings: Node `module.register()` deprecation (`DEP0205`), no files matching `src/**/*.mdx`, and minified chunks exceeding 500kB.

## Errors and limitations

- Final browser results: **0 page errors**, **0 browser console errors**.
- Headless Chromium only; no Firefox/WebKit, real-device touch, or physical trackpad verification. Earlier touch evidence uses Chromium CDP emulation.
- Browser interactions target actual Storybook iframe stories; the generated production Storybook was built successfully but not separately browser-served.
- Counts/disabled, actual controlled parent, and narrow overflow are separate existing stories. No new combined story or application component was introduced.
- Focus evidence covers ordinary-width selected tabs at both overflow ends. Oversized labels necessarily cannot fit fully within the 320px row.
- All Storybook servers launched for this verification were stopped.
