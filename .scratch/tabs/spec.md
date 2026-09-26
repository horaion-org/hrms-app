# Spec: Tabs and Count badge

Status: ready-for-agent

## Problem Statement

Horaion's design has a row of **Tabs**: labelled views of the same page shown side by side. Exactly one tab is active at a time. The active tab has an Ink Blue label with an Ink Blue underline, and the rest have grey labels. Pages such as a person's profile or a leave overview need to split their content into these views without leaving the page. Some tabs also need to show a **Count badge**, for example how many leave requests are pending, so people can see where work is waiting before they open the tab.

Neither exists in the codebase. There's no tabs component, no count badge and no keyboard-accessible pattern for switching views. A developer who needs tabs today would have to hand-write the markup, the ARIA roles and the arrow-key handling at the call site. Each page would get it slightly different, and some would get it inaccessible.

## Solution

Two new shared UI primitives, usable from Storybook and ready for any page:

1. **Count badge.** A small pill showing a number beside a label. It hides itself when the count is zero, caps large numbers at `99+`, and has a tone for active, inactive and disabled use.
2. **Tabs.** A compound component made of Tabs, Tab list, Tab, Tab panels and Tab panel. It follows the WAI-ARIA tabs pattern: clicking a tab or pressing the arrow keys switches the view, screen readers announce the tab list and the selected tab, and only the active tab's panel is on the page. A tab can show a Count badge and can be disabled. When there are more tabs than fit, the row scrolls sideways.

Tabs is a thin, styled wrapper around Headless UI's Tabs, which is already a project dependency (see ADR 0001).

## User Stories

### Tabs: selecting views

1. As an HR user, I want to see all the views of a page as a row of labelled tabs, so that I know what's available without hunting.
2. As an HR user, I want the active tab to stand out with an Ink Blue label and underline, so that I always know which view I'm looking at.
3. As an HR user, I want inactive tabs shown in a quieter grey, so that the active tab is the obvious focus.
4. As an HR user, I want clicking a tab to show its view straight away, so that switching views is quick.
5. As an HR user, I want an inactive tab's label to turn Ink Blue when I hover over it, so that I can tell it's clickable.
6. As an HR user, I want switching tabs to keep me on the same page, so that I don't lose my place in the product.
7. As an HR user, I want a disabled tab to look greyed out and not respond to clicks, so that I understand that view isn't available right now.
8. As an HR user, I want a sensible tab selected when a page first opens, so that I never see a page with no view selected.

### Tabs: overflow

9. As an HR user on a narrow screen, I want the tab row to scroll sideways when the tabs don't fit, so that every tab stays reachable.
10. As an HR user, I want the scrollbar hidden on the tab row, so that the row looks as clean as the design.
11. As an HR user, I want the active tab scrolled into view when it changes, so that I can always see which tab is active.
12. As an HR user using a language with longer labels, I want long labels to stay on one line and scroll with the row, so that the tab row never wraps or breaks the layout.

### Tabs: keyboard and assistive technology

13. As a keyboard user, I want Tab to move focus to the active tab and then on into its panel, so that the tab row counts as one stop in the page's focus order.
14. As a keyboard user, I want Left and Right to move to the previous and next tab and select it, so that I can switch views without a mouse.
15. As a keyboard user, I want arrow keys to wrap from the last tab back to the first and the other way round, so that I can cycle through the tabs.
16. As a keyboard user, I want Home and End to jump to the first and last tab, so that I can get to either end of a long tab row quickly.
17. As a keyboard user, I want disabled tabs skipped by the arrow keys, Home and End, so that I never land on a view I can't open.
18. As a keyboard user, I want a visible focus ring on the focused tab, so that I can see where I am.
19. As a screen-reader user, I want the tab row announced as a tab list with a name, so that I know what the tabs are for.
20. As a screen-reader user, I want each tab announced as a tab with its position and whether it's selected, so that I can find my way around the set.
21. As a screen-reader user, I want each panel announced as a tab panel named after its tab, so that I know which view I've moved into.
22. As a screen-reader user, I want a disabled tab announced as unavailable, so that I understand why it doesn't open.
23. As a screen-reader user, I want a tab's count read out with its label, so that I hear how many items are waiting.

### Count badge

24. As an HR user, I want a tab to show a count beside its label, such as pending leave requests, so that I can see where work is waiting before I open the tab.
25. As an HR user, I want no badge when the count is zero, so that empty views don't draw my attention.
26. As an HR user, I want counts over 99 shown as `99+`, so that the tab width stays steady and the row doesn't jump around.
27. As an HR user, I want the badge on the active tab filled with Ink Blue, so that it matches the active tab.
28. As an HR user, I want badges on inactive tabs shown in quiet greys, so that they inform without competing with the active tab.
29. As an HR user, I want a disabled tab's badge greyed out as well, so that the whole tab reads as unavailable.
30. As a developer, I want the Count badge available as its own component, so that I can reuse it beside other labels later.

### Developer experience

31. As a developer, I want to put together Tabs, Tab list, Tab, Tab panels and Tab panel as separate components, so that I can place the tab row and the panels where the page layout needs them.
32. As a developer, I want to give a starting tab index and let the component manage selection, so that simple pages need no state of their own.
33. As a developer, I want to control the selected tab index myself and get a change callback, so that I can sync the view to a URL search param or other state.
34. As a developer, I want tabs and panels paired by order, so that I never write ids, values or ARIA attributes myself.
35. As a developer, I want the type checker to reject a Tab list without an accessible name, so that I can't ship an unnamed tab list by accident.
36. As a developer, I want standard element props such as `className` and `data-*` passed through to each part, so that I can adjust layout at the call site.
37. As a developer, I want inactive panels removed from the page, so that their data fetches don't run until someone opens them.
38. As a developer, I want Storybook stories for Tabs and the Count badge, so that I can check them against the design and try the states without running the app.
39. As a designer, I want stories showing the design's eight-tab row, overflow, counts and disabled tabs, so that I can review every state in one place.

## Implementation Decisions

### Count badge module

- **Location and name.** It's a generic UI primitive called Count badge (`CountBadge`) in the shared UI components area, with the full component set: component, stories, test and barrel. The name leaves "Badge" free for a future general status badge.
- **Interface.**
  - `count: number | undefined` is the number to show.
  - `tone: "active" | "inactive" | "disabled"` controls the colours.
  - Other `span` props, including `className`, are passed through.
- **Display rules.** A count of `0` or `undefined` renders nothing (`null`). A count from 1 to 99 renders as is, and anything over 99 renders `99+`.
- **Look.** The badge is a rounded pill with a 20px height and minimum width, centred `text-xs` digits and small horizontal padding. Tones:
  - **Active:** `ink-blue-900` fill with `white` text.
  - **Inactive:** `neutral-300` fill with `neutral-800` text.
  - **Disabled:** `neutral-200` fill with `neutral-400` text.
  - There's no badge design yet. These values were agreed in design discussion and give way to a design if one arrives.
- **Accessibility.** The badge text is ordinary text, so it becomes part of the surrounding label's accessible name (for example "Pending 3").

### Tabs module

- **Location and structure.** It's a UI primitive in the shared UI components area, built as nested component folders following the layout README's nesting convention. There are five parts, Tabs, Tab list, Tab, Tab panels and Tab panel, each with the full component file set, plus one barrel that exports all of them. Named exports only.
- **Built on Headless UI, per ADR 0001.** Each part is a thin, Tailwind-styled wrapper around the matching `@headlessui/react` component: Tabs wraps `TabGroup`, Tab list wraps `TabList`, Tab wraps `Tab`, Tab panels wraps `TabPanels` and Tab panel wraps `TabPanel`. The library supplies the ARIA roles and attributes, the id wiring, the roving tabindex, keyboard handling and panel unmounting. The wrappers add our looks, our required props and the Count badge. Nothing hand-rolls behaviour the library already provides.
- **The dependency.** `@headlessui/react` is already installed but sits in the development dependencies. Tabs ships it at runtime, so it moves to the runtime dependencies.
- **Tabs (root).**
  - `selectedIndex?: number` and `onChange?: (index: number) => void` make it controlled.
  - `defaultIndex?: number` makes it uncontrolled.
  - It also takes `children`, plus `div` props passed through.
  - This is the library's API, used as is. A caller that wants named views, for example synced to a URL search param, maps names to indexes itself.
  - Automatic activation (the library default) is kept. The `manual` and `vertical` options aren't exposed.
- **Initial selection.** With no `selectedIndex` or `defaultIndex`, the first tab that isn't disabled is selected. The library is expected to do this itself, and tests pin the behaviour. If it doesn't, the wrapper corrects it.
- **Tab list.**
  - It renders the library's tablist.
  - Its props require either `aria-label` or `aria-labelledby`, and the type rejects a Tab list with neither.
  - Layout: one row with a 24px gap, no wrapping, sideways scrolling with the scrollbar hidden, and no track line under the row (matching the design).
  - When the selected tab changes, it scrolls that tab into view on the tab row's own axis only, never scrolling the page vertically. The library doesn't do this, so the wrapper adds it.
- **Tab.**
  - Props:
    - `children`, the label
    - `count?: number`, rendered through Count badge with the tone that matches the tab's state
    - `disabled?: boolean`
    - other `button` props passed through
  - Tabs are matched to panels by their order: the nth Tab controls the nth Tab panel.
  - Looks are applied through the library's state data attributes (`data-selected`, `data-hover`, `data-focus`, `data-disabled`), not through render-prop branching.
- **Keyboard behaviour** comes from the library. Left and Right move to the previous or next tab that isn't disabled, wrapping at the ends, and select it. Home and End (and Page Up and Page Down) move to the first and last tab. Tests pin this as part of our contract.
- **Tab looks** (colour tokens from the colour-tokens spec):
  - **Active:** `ink-blue-900` label with a 2px `ink-blue-900` underline across the tab's full width.
  - **Inactive:** `neutral-600` label.
  - **Hover (inactive, not disabled):** `ink-blue-700` label.
  - **Disabled:** `neutral-400` label and a not-allowed cursor. Hovering doesn't change it.
  - **Focus-visible:** a 2px `ink-blue-500` outline with an offset, matching Button.
- **Tab size.** Measured from the design mockup: the label is 16px (`text-base`), horizontal padding is 4px and each tab is 40px tall. The Tab list adds 4px of padding on every side so focus outlines aren't clipped by the scrolling row, which makes the row 48px tall. That was accepted for now on 2026-09-26, and the design wins if it disagrees. The label and Count badge sit side by side with a small gap. Labels never wrap.
- **Tab panels** wraps the library's panels container and passes `div` props through. Tab panels must hold the Tab panels in the same order as the tabs.
- **Tab panel.**
  - Props: `children` and other `div` props passed through.
  - Only the selected panel is mounted, which is the library default (`unmount`), kept as is.
  - The selected panel is focusable, so keyboard users can reach a panel with no focusable content.
- **Selection callbacks.** `onChange` fires only when the selection actually changes. It doesn't fire when the selected tab is clicked again, and it never fires for a disabled tab. Tests pin this, and if the library differs, the wrapper filters it.
- **Glossary.** Use **Tab** and **Count badge** as defined in the project glossary, in code, stories and comments. Avoid "segment", "sub-nav" and "chip". Tabs switch views within a page. Moving between **Modules** is the Sidebar's job.

## Testing Decisions

- **What a good test looks like.** It checks what a user or assistive technology can see:
  - roles, accessible names and `aria-selected`
  - which panel is on the page and where focus goes
  - the callbacks a consumer gets
  - which CSS a class produces

  It doesn't check the context, the roving-tabindex internals, the order of class strings or markup nesting beyond what accessibility needs. Tests use Testing Library queries by role and name, and `userEvent` for clicks and keys.
- **Seam 1: the composed Tabs public API.** This is the main behavioural seam. Tests render a full Tabs with a Tab list, several Tabs (some with counts, one disabled) and matching Tab panels, and check that:
  - there's a tab list with its accessible name, and tabs and a panel with the right roles
  - the panel's accessible name comes from its tab
  - exactly one tab has `aria-selected="true"` and only its panel is on the page
  - with no `defaultIndex`, the first tab that isn't disabled is selected
  - clicking a tab selects it and swaps the panel, and clicking a disabled tab does nothing
  - Right, Left, Home and End move focus and selection, wrap at the ends and skip disabled tabs
  - Tab moves focus from the tab list into the active panel
  - uncontrolled use with `defaultIndex` works
  - in controlled use, `selectedIndex` decides the selection, `onChange` fires with the new index and doesn't fire again for the already-selected tab, and the selection doesn't change unless the parent updates `selectedIndex`
  - a tab with `count` includes the number in its accessible name, and a count of 0 adds nothing
  - using a Tab outside Tabs throws
  - the type check rejects a Tab list without `aria-label` or `aria-labelledby` (`expectTypeOf`)
- **The Tab list, Tab, Tab panels and Tab panel test files.** The component conventions require one per part. Each renders through the same composed Tabs setup and covers only its own part: pass-through props and `className` for all four, the disabled tab's attributes, and the panel's focusability and labelling. None of them test Headless UI internals.
- **Seam 2: Count badge on its own.** It's a separate public component, so it gets its own test, checking that:
  - `0` and `undefined` render nothing
  - 1 to 99 render the number and 100 or more render `99+`
  - each tone renders
  - pass-through props reach the element
- **The existing compiled-stylesheet test** (not a new seam) gets extended so every colour class that Tabs and Count badge use produces CSS from the real Tailwind entry, as it already does for Button and Sidebar.
- **Scroll-into-view** isn't tested in jsdom, which has no layout. Tests stub `scrollIntoView` or `scrollTo` the same way the Sidebar tests stub `window.scrollTo`. The behaviour gets checked by hand in Storybook.
- **Stories.** They're Storybook stories only, not run as tests:
  - Count badge: each tone, plus 0, 5 and 150
  - Tabs: the design's eight-tab row, tabs with counts, a disabled tab, a narrow container that overflows, and a controlled example
- **Prior art.** The Sidebar item and Input suites set the structure: Testing Library, `userEvent`, `expectTypeOf` for type-level checks and `vi` stubs for browser APIs jsdom lacks.
- **Gates.** `pnpm lint` (zero warnings), `pnpm test:unit` and `pnpm build` must all pass.

## Out of Scope

- Tabs that navigate between routes (router links with `aria-current`). These tabs switch views within one page. A caller can still sync the selected index to a URL search param through the controlled API.
- Manual activation mode and vertical tab lists (both supported by the library but not exposed).
- Value-based selection (`value` and `onValueChange` instead of an index).
- A "More" menu for overflowing tabs.
- Keeping inactive panels mounted, or a per-panel keep-mounted option.
- Icons inside tabs.
- A general status badge with Success, Warning or Error tones. Count badge only shows counts.
- Right-to-left arrow-key reversal.
- End-to-end (Playwright) tests.
- Using Tabs on any real page.

## Further Notes

- ADR 0001 (Headless UI for accessible primitives) was recorded during this design. Tabs is the first component built under it. An earlier draft chose hand-rolling because `@headlessui/react` was missed in the development dependencies. That was corrected before any code was written.
- A value-based selection API (`value` and `onValueChange` instead of an index) is out of scope. It was dropped so the wrappers stay thin over the library's index-based API.
- The glossary gained the **Tab** and **Count badge** terms during this design.
- The Count badge colours and all tab sizes were measured or agreed without a full design file. If a design file arrives with different values, the design wins.

## Implementation evidence

All six tickets are completed and integrated. See [verification.md](verification.md) for prerequisites, combined checks, review outcomes and limitations, and [browser-verification.md](browser-verification.md) for integrated Chromium evidence.
