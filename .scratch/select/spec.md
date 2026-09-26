# Spec: Select form control

Status: ready-for-agent

## Problem Statement

The Horaion design defines a control for choosing values from a list: a compact bordered trigger with a label and a chevron that opens a panel of options, each with a checkbox. The codebase has no such component. `@headlessui/react` is installed but unused, and no shared component offers a list of choices.

Without one, every form or filter bar that needs a choice would build its own popup. Keyboard handling, focus return, ARIA roles and styling would drift between call sites, and in everyday speech "dropdown" gets confused with an action menu.

## Solution

Add a reusable **Select** form control (see `CONTEXT.md`) to the shared forms components, built on Headless UI's `Listbox` (see `docs/adr/0001-headless-ui-for-popup-controls.md`). One component handles both single and multi selection through a `multiple` prop. Callers pass options as data. The trigger shows the placeholder, the selected label, or a count summary. It uses the same box, status and disabled treatment as Input, so the two sit together in forms. Its text follows the mock's Ink Blue.

Select is only the control. Labels, helper text and error messages are left to a future labelled-field composite, as with Input.

## User Stories

1. As a developer, I want a shared Select, so that I stop building one-off popups for choosing values.
2. As a developer, I want to import Select through the `@/` alias from the shared forms components, so that it follows the shared import convention.
3. As a developer, I want to pass options as `{ value, label, disabled? }` data, so that every Select looks and behaves the same.
4. As a developer, I want single selection by default and multi selection with `multiple`, so that one component covers both.
5. As a developer, I want `value` and `onChange` typed as `string` in single mode and `string[]` in multi mode, so that the compiler catches mode mismatches.
6. As a developer, I want `defaultValue` for uncontrolled use, so that simple forms need no state.
7. As a developer, I want `name` to submit the value with a native form, so that Select works without JavaScript form libraries.
8. As a developer, I want `ref` to reach the trigger button, so that React Hook Form can focus the Select on a validation error.
9. As a developer, I want to connect Select to React Hook Form through `Controller`, so that form wiring is consistent.
10. As a developer, I want a `status` prop taking "success" or "error", reusing Input's status values, so that validation looks the same across controls.
11. As a developer, I want `status="error"` to set `aria-invalid` on the trigger, so that assistive technology announces it without extra wiring.
12. As a developer, I want `disabled` on the whole Select and on single options, so that I can show unavailable choices.
13. As a developer, I want the `className` I pass to size the trigger, so that I can make it full width in a form.
14. As a developer, I want to override the count summary with `formatSummary` and the empty message with `emptyText`, so that a filter bar can say "2 departments".
15. As a developer, I want to pass `aria-label` or `aria-labelledby`, so that the Select has an accessible name even though the placeholder isn't one.
16. As a user, I want the trigger to show the placeholder when nothing is selected, the option's label when one is, and "N selected" when several are, so that I can see my choice without opening it.
17. As a user, I want the chevron to point down when closed and up when open, so that I know the panel's state.
18. As a user, I want the panel to open below the trigger, flip upward near the bottom of the screen, and be at least as wide as the trigger, so that options are never cut off.
19. As a user, I want long lists to scroll inside the panel after about six rows, so that the page layout isn't broken.
20. As a user, I want multi mode to stay open while I tick options, so that I can choose several in one go.
21. As a user, I want single mode to close when I pick, so that one choice takes one click.
22. As a user, I want Escape or a click outside to close the panel, so that I can back out.
23. As a user, I want Ink Blue checkboxes in multi mode and an Ink Blue tick in single mode, so that I can see what's selected, and so that single mode doesn't look like it allows several choices.
24. As a user, I want the row under my mouse or keyboard highlighted, so that I know which option Enter or Space will pick.
25. As a user, I want disabled options greyed out and skipped by the keyboard, so that I don't try to pick them.
26. As a user, I want a "No options" message when the list is empty, so that the Select doesn't look broken.
27. As a user, I want the same focus border and status colours as Input, so that the form looks consistent.
28. As a keyboard user, I want to open the Select with Enter, Space or the arrow keys, move with arrows, jump by typing, and pick with Enter or Space, so that I don't need a mouse.
29. As a keyboard user, I want focus to go back to the trigger when the panel closes, so that I don't lose my place.
30. As a screen-reader user, I want listbox and option roles with selected state announced, so that I know what's chosen.
31. As a screen-reader user, I want a disabled Select with an error still announced as invalid.
32. As a touch user, I want the trigger at least 44px tall and rows 40px tall, so that it's easy to tap.
33. As a designer, I want Storybook stories for single, multi, placeholder, selected, statuses, disabled, disabled options, long list and empty list, so that I can review against the mock.
34. As a maintainer, I want Select to follow the standard component file set, so that it's as easy to find and test as Input.

## Implementation Decisions

- **Name and location:** the component is called Select, the glossary term, and lives in the shared forms components next to Input. It gets the full file set: component, constants, story, test and index re-export. It uses a named export, and its return type is the shared `FunctionComponent` type. Creating it was approved under the CLAUDE.md component gate.
- **Foundation:** Headless UI's Listbox family (button, options panel, option), using its built-in `multiple`, `name`, `disabled` and anchored-panel support. All styling is Tailwind with Horaion tokens. This is the first use of the library; see ADR 0001 (Headless UI for popup controls).
- **Props:** a discriminated union on `multiple` (a type shape, kept because prose would be less precise):

  ```ts
  type SelectOption = { value: string; label: string; disabled?: boolean };

  type SharedProps = {
    options: SelectOption[];
    placeholder?: string;
    status?: InputStatus;               // reused from Input
    disabled?: boolean;
    name?: string;                      // hidden inputs for native forms
    className?: string;                 // goes on the trigger
    "aria-label"?: string;
    "aria-labelledby"?: string;
    emptyText?: string;                 // overrides "No options"
    formatSummary?: (selected: SelectOption[]) => string; // overrides "N selected"
    ref?: Ref<HTMLButtonElement>;       // the trigger
  };

  type SelectProps = SharedProps &
    (
      | { multiple?: false; value?: string; defaultValue?: string; onChange?: (value: string) => void }
      | { multiple: true; value?: string[]; defaultValue?: string[]; onChange?: (value: string[]) => void }
    );
  ```

  The constants module exports the option type, and the index re-exports the component, its props type and the option type.
- **Values:** strings only, compared with `===`. Callers map objects to IDs. Multi-mode values reach `onChange` in the same order as `options`.
- **Status:** reuse Input's exported status list and type. Don't define new values. `status="error"` sets `aria-invalid="true"` on the trigger, and an explicit `aria-invalid` from the caller wins.
- **Trigger text:** nothing selected → `placeholder`. One selected → that option's label. Two or more → `formatSummary(selected)` if given, otherwise a translated plural ("{{count}} selected"). Long text truncates with an ellipsis.
- **Trigger box:** mirrors Input: `h-11 px-4 gap-3 rounded-lg`, 1px border, white, `text-sm`. The text and a 20px chevron are both Ink Blue 900. The chevron points down when closed and up when open (existing chevron icons); while open, only the chevron changes. The trigger fits its content by default, and `className` goes on the trigger.
- **Panel:** anchored `bottom start` with a small gap, flipping when there's no space below. At least the trigger's width and growing to fit the longest label. White, `rounded-lg`, 1px Neutral 400 border, small shadow, `py-1`. Scrolls vertically after about 6 rows. Rows are 40px tall with `px-4`, label on the left and indicator on the right.
- **Row indicators:** these reuse existing icons. Multi mode shows a filled checkbox in Ink Blue 900 when selected and an empty checkbox in Neutral 400 when not. Single mode shows a tick in Ink Blue 900 on the selected row only.
- **Colour mapping:** only existing Horaion tokens.

| Element / state | Border | Background | Text / icons |
|---|---|---|---|
| Trigger, neutral | Neutral 400 | White | Ink Blue 900 |
| Trigger, focus (status-free) | Ink Blue 900 | White | unchanged |
| Trigger, Success / Error | Success 600 / Error 600, plus Ink Blue 500 focus ring (2px, 2px offset) when focused | White | Ink Blue 900 |
| Trigger, disabled | Neutral 400 | Neutral 200 | Neutral 500 |
| Option row | none | White | label Neutral 800 |
| Option row, active (hover or keyboard) | none | Neutral 100 | unchanged |
| Option row, disabled | none | White | label Neutral 500; checkbox or tick Neutral 400 |
| Empty message | none | White | Neutral 500 |

- **Precedence:** disabled beats status, and status beats focus, exactly as in Input.
- **Behaviour:** Headless UI defaults. Multi mode stays open while ticking, and single mode closes on pick. Escape and a click outside close the panel, and focus returns to the trigger. Single mode can't be cleared from the control; clicking the selected row again keeps it selected.
- **Empty list:** the panel shows one row that can't be selected, with `emptyText` or a translated default ("No options").
- **i18n:** Select is the first shared component with built-in strings. Add a `select` group to both the English and Spanish translations: a selected-count plural (i18next `_one`/`_other`) and a no-options message.
- **Accessible name:** the placeholder isn't a label. Callers supply `aria-label` or `aria-labelledby`, which are passed to the trigger.

## Testing Decisions

- **One seam (confirmed with the user):** Select's rendered public interface, tested with Testing Library and user-event in Vitest. Tests check roles, names, `aria-selected`, `aria-invalid`, trigger text, callbacks, hidden form inputs and state classes, and never Headless UI internals.
- **Prior art:** Input's unit test, for status, disabled precedence and `className`. Button's test, for rendering by role and disabled behaviour.
- **Not tested in jsdom:** panel positioning (flip, anchor gap) and the scroll cap. Review these in Storybook.
- **What to cover:**
  - The trigger renders as a button with the given accessible name, and shows the placeholder when empty.
  - Clicking opens a listbox with one option per `options` entry.
  - Single: picking calls `onChange` with the string, closes the panel, and shows the label in the trigger.
  - Multi: ticking calls `onChange` with an array in option order, keeps the panel open, and marks the options selected.
  - The trigger text for 0, 1 and 2+ selections, including a `formatSummary` override.
  - Keyboard: arrows move the active option, Enter or Space selects, Escape closes, and focus returns to the trigger.
  - Disabled options can't be picked. A disabled Select doesn't open.
  - `status="error"` sets `aria-invalid`, stays set when disabled, and each status shows its border.
  - An empty `options` array shows "No options" or `emptyText`.
  - `name` renders hidden inputs with the selected values.
  - `ref` reaches the trigger button, and `className` goes on the trigger.
  - A React Hook Form `Controller` example submits the selected values.
- **Stories:** single, multi (the mock's state), placeholder, one selected, many selected, Success, Error, disabled, disabled options, a long scrolling list, and an empty list. Controls for `multiple`, `status` and `disabled`.
- **Checks:** `pnpm lint` (zero warnings) and `pnpm test:unit` must pass.

## Out of Scope

- Search or filter-as-you-type (a future Combobox).
- Option groups or section headers, "select all", chips or tags in the trigger.
- Async loading and virtualised long lists.
- A clear button, and clearing a single-mode choice from the control.
- A built-in visible label, helper text or error message.
- Non-string values.
- An action menu. "Dropdown" is avoided as a term; a future Menu component would be separate.
- Switching existing screens over to Select.
- Playwright visual regression tests.

## Further Notes

- The mock is a PNG export (see the design folder beside this spec). It shows only multi mode, closed and open, with Ink Blue 900 trigger text. The single-mode tick, row highlight, disabled look, status states and empty list were decided in the grilling session, not taken from the design; confirm them with a designer.
- Select's trigger text is Ink Blue 900 on purpose, which differs from Input's Neutral 500 placeholder. The mock uses it to signal a clickable control.
- The box dimensions come from Input, not from measuring the PNG, so Input and Select line up in a form row.
- Glossary: **Select** was added to the domain glossary under "Controls", with Dropdown and picker listed as words to avoid.
