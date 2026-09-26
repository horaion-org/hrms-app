# Spec: Input form control

Status: resolved

## Problem Statement

The Horaion design defines a single-line text field: a bordered box with optional leading and trailing icons, drawn in five states (filled, empty with placeholder, Success, Error, and disabled). The codebase has no such component. The only text inputs today are raw `<input>` elements in the example feature, styled inline with ad-hoc classes and Tailwind's stock reds instead of the Horaion colour ranges.

So every form a developer builds has to restyle the field from scratch. Fields will drift from the design and from each other, and there is no consistent, accessible way to show that a value is valid or invalid.

## Solution

Add a reusable Input form control to the shared forms components. It renders the designed box around a native text input and accepts every native input attribute, so it works directly with React Hook Form's `register`. It has optional leading and trailing icon slots, and a single `status` prop to show Success or Error. Focus uses Ink Blue, following the glossary. Disabled uses the Neutral range and overrides any status visually. The Error status also marks the field invalid for assistive technology.

The Input is only the box. Labels, helper text and error messages are left to a future composite that wraps it.

## User Stories

1. As a developer, I want a shared Input component, so that I stop hand-styling raw `<input>` elements in every feature.
2. As a developer, I want to import Input through the `@/` alias from the forms components, so that it follows the same import convention as every other shared component.
3. As a developer, I want Input to accept every native input attribute (type, name, value, defaultValue, placeholder, autoComplete, maxLength and so on), so that I never lose native behaviour by using it.
4. As a developer, I want to spread React Hook Form's `register("field")` straight onto Input, so that form wiring looks the same as with a native input.
5. As a developer, I want Input to forward its ref to the native input element, so that React Hook Form can focus the field on validation errors and I can focus it programmatically.
6. As a developer, I want `onChange`, `onBlur` and `onFocus` to fire from the native input, so that controlled and uncontrolled patterns both work.
7. As a developer, I want the `className` I pass to go on the bordered box, so that I can size and place the whole field (for example make it full width) in a layout.
8. As a developer, I want an optional leading icon slot, so that I can put a contextual icon such as search before the text.
9. As a developer, I want an optional trailing icon slot, so that I can put an icon or small control (for example clear or show password) after the text.
10. As a developer, I want the icon slots to accept any React node, so that I can pass either a decorative icon or an interactive button.
11. As a developer, I want icons in the slots sized and coloured by Input, so that any icon from the Icon set looks right without extra classes.
12. As a developer, I want the icon slots to take no space when empty, so that a plain field has no extra gaps.
13. As a developer, I want a `status` prop that takes "success" or "error", so that I can show validation results with one prop and never have conflicting states.
14. As a developer, I want the allowed status values exported as a list, so that stories and other components can offer them without repeating them.
15. As a developer, I want to leave `status` unset for the neutral look, so that the common case needs no extra props.
16. As a developer, I want `status="error"` to set `aria-invalid` on the native input, so that assistive technology announces the field as invalid without extra wiring.
17. As a developer, I want Success and Error to use the Success and Error colour ranges, so that validation colours match the rest of the product.
18. As a user, I want to see a Neutral border on an idle field, so that I can tell where to type.
19. As a user, I want placeholder text in a lighter Neutral shade than entered text, so that I can tell a hint from a real value.
20. As a user, I want the border to turn Ink Blue when I focus the field, so that I know where my typing will go.
21. As a user, I want the focus border to appear when I click into the field as well as when I tab in, so that focus is always visible while I type.
22. As a user, I want a Success border on a field whose value has been confirmed, so that I know it's fine.
23. As a user, I want an Error border on a field with a problem, so that I can see what needs fixing.
24. As a user, I want the Success or Error border to stay while I'm focused on the field, with an Ink Blue focus ring around it, so that I can see both the field's validation state and that the field has focus.
25. As a user, I want a disabled field to have a Neutral background with Neutral text and icons, so that I can see at a glance it can't be edited.
26. As a user, I want a disabled field to look disabled even if it also has a status, or is disabled by a surrounding disabled fieldset, so that the disabled look never gets mixed with validation colours.
27. As a screen-reader user, I want a disabled field with an error still announced as invalid, so that I don't lose that meaning even though it isn't shown visually.
28. As a screen-reader user, I want decorative icons in the slots to be hidden from me, so that I only hear meaningful content.
29. As a keyboard user, I want to tab into the field and type, so that I can fill in forms without a mouse.
30. As a keyboard user, I want a disabled field skipped when I tab, so that I don't stop on fields I can't edit.
31. As a touch user, I want the field at least 44px tall, so that it's easy to tap.
32. As a designer, I want Storybook stories for every designed state, so that I can review the Input against the mock.
33. As a designer, I want Storybook controls for status, disabled, placeholder and value, so that I can try combinations interactively.
34. As a maintainer, I want the Input to follow the standard component file set, so that it's as easy to find and test as Button.

## Implementation Decisions

- **Name and location:** the component is called Input and lives in the shared forms components, following the forms README's own example. It gets the full file set: component, constants, story, test and index re-export. It uses a named export, and its return type is the shared `FunctionComponent` type.
- **Scope:** Input is only the box: the border, background, icon slots and native input. It doesn't render a label, helper text or error message.
- **Props:** Input's props are the native input's props including ref, plus:
  - `leadingIcon?: ReactNode`
  - `trailingIcon?: ReactNode`
  - `status?: InputStatus`

  All native props, including `ref`, `disabled`, `placeholder` and `type`, are spread onto the native input. `className` is the one exception and goes on the bordered wrapper.
- **Status values:** `inputStatuses = ["success", "error"] as const`. `InputStatus` is derived from it. Both live in a constants module separate from the component file, following Button's pattern (which keeps `react-refresh/only-export-components` satisfied). The index re-exports the component, its props type, the status list and the status type.
- **Accessibility:** `status="error"` sets `aria-invalid="true"` on the native input. An `aria-invalid` the caller passes explicitly is not silently dropped.
- **Structure:** a bordered wrapper holds the leading slot, then the native input, then the trailing slot, in that order. The native input fills the remaining width and has no border, outline or background of its own. The wrapper draws the whole box. Empty slots render nothing.
- **Dimensions:** 44px tall (`h-11`), 16px horizontal padding (`px-4`), 12px gap (`gap-3`), 8px corner radius (`rounded-lg`), 1px border, small text size (`text-sm`). Icons in the slots are 20px and don't shrink.
- **Colour mapping:** only existing Horaion tokens are used.

| State | Border | Background | Text / icons |
|---|---|---|---|
| Neutral | Neutral 400 | White | text and icons Neutral 900; placeholder text Neutral 500 |
| Focus (focus within the box) | Ink Blue 900 (its default shade) | White | unchanged |
| Success | Success 600 | White | Neutral 900 |
| Error | Error 600 | White | Neutral 900 |
| Disabled | Neutral 400 | Neutral 200 | text and icons Neutral 500 |

- **Precedence:** disabled beats status, and status beats focus. When disabled, the Success/Error border and any focus styling aren't shown, but `aria-invalid` still is. When a status is set, focus keeps the status border and adds an Ink Blue 500 focus ring outside it (2px wide, 2px offset, matching Button's focus outline), so focus is always visible (WCAG 2.4.7). A status-free field keeps the Ink Blue 900 focus border and gets no ring.
- **Disabled detection:** the disabled look follows the native input's actual disabled state, not only the `disabled` prop, so an Input inside a disabled fieldset looks disabled too.
- **Focus trigger:** focus styling follows focus within the wrapper, so it shows for both mouse and keyboard focus.
- **Cursor:** a disabled field shows the not-allowed cursor, matching Button.
- **No hover state and no size variants:** there's one size, and a hover look only gets added when the design defines one.
- **Placeholder icons:** the circles in the mock are placeholders for real icons. The Input picks no icon of its own.

## Testing Decisions

- **One seam:** the Input's rendered public interface, tested with Testing Library and user-event in Vitest. Tests check only what a consumer can observe: roles, attributes, values, events, DOM order and the wrapper's state classes. They don't check internal helpers or how classes are put together.
- **Prior art:** the Button component's unit test, which already covers the matching concerns: rendering by role, disabled behaviour, icon order around the content, and merging a custom `className`.
- **What to cover:**
  - It renders a textbox, and typing updates its value.
  - Native props such as `placeholder`, `type` and `name` reach the native input.
  - `ref` reaches the native input element.
  - Leading and trailing icons render before and after the input, and are left out when not given.
  - `status="error"` sets `aria-invalid="true"`. No status, or `status="success"`, doesn't.
  - Each status puts its colour-range border on the wrapper.
  - A disabled field can't be typed into, gets the disabled look, and doesn't show the status border, but still has `aria-invalid` when `status="error"`.
  - A custom `className` goes on the wrapper, not the native input.
- **Stories:** stories cover every designed state (filled, placeholder, Success, Error, disabled) plus a disabled-with-error example. They use a placeholder circle icon in both slots, like Button's stories, and give controls for status and disabled. Stories are for manual visual review, not automated assertions.
- **Checks:** `pnpm lint` (zero warnings) and `pnpm test:unit` must pass.

## Out of Scope

- A label, helper text, character counter or error-message rendering, which belong to a future composite that wraps Input.
- A hover state.
- Size variants.
- Warning status. The design shows only Success and Error.
- Built-in behaviours such as a clear button, password visibility toggle or status icons. Callers supply these through the icon slots.
- Multi-line text (textarea), select, and date or number pickers.
- Switching the example feature's raw inputs over to Input.
- Playwright visual regression tests.
- Changes to the domain glossary. No new product language comes from this work.

## Further Notes

- The design mock is a PNG export, and the shade mapping above was estimated from it by eye and then confirmed. If exact Figma values later disagree, update the colour mapping; the component interface doesn't need to change.
- Ink Blue's default shade (900) is used for the focus border. Button's focus outline uses Ink Blue 500. Ink Blue 500 was considered for Input's border and not chosen. The status focus ring does use Ink Blue 500, because it is an outline like Button's.
- 2026-09-26 amendment (after code review): the original rule "when a status is set, focus doesn't swap its border for Ink Blue" left a focused Success/Error field with no visible focus indicator. The status focus ring and disabled detection from the native input were added for this reason; see ticket 04.
- The glossary defines Error as covering "missing inputs", which matches `status="error"` being used for failed validation.

## Comments

### 2026-09-26 — Implementation complete

- Tickets 01–03 are resolved and integrated into the working tree. Ticket 01 ran first; tickets 02 and 03 ran concurrently in isolated worktrees seeded with its uncommitted files. No files were staged or committed. The handoff snapshot remains unchanged.
- Implemented the five-file Input component under `src/components/forms/Input/`. Stories reuse the existing shared `PlaceholderIcon`, rather than creating another component. Explicit caller `aria-invalid` values take precedence over the Error default; disabled fields use the approved not-allowed cursor.
- Final combined checks passed: 33 Input tests, 374 unit tests across 9 files, zero-warning lint, production build, Input formatting, and Storybook build. All six existing Playwright tests passed across Chromium, Firefox and WebKit; these cover unchanged application navigation rather than Input. Temporary Chromium checks additionally verified five Input state cases with actual computed colours, 20px icons, nested interactive controls, and disabled > status > focus precedence. Evidence is recorded in tickets 02 and 03.
- Standards review: one terminology finding corrected; one optional disabled-test duplication suggestion retained as a low-priority maintenance follow-up. Spec review: one nested-icon colour finding fixed with a red–green regression and computed-CSS verification. Coordinator reviewed the fix; no unresolved acceptance-criteria findings remain.
- Prerequisites: installed dependencies with `pnpm install --frozen-lockfile`. This local UI component has no database, authentication, persistence or concurrent-write dependency, so database/security/concurrency integration checks are not applicable. Chromium launches and all configured browser projects ran successfully.
- Skill evidence: all five referenced `SKILL.md` files exist under `~/.claude/skills/`. A Claude Code runtime with its Skill tool enabled advertised `tdd`, `code-review`, `resolving-merge-conflicts` and `pr`, but did not advertise `implement-spec`. The first discovery attempt disabled all tools and is not valid evidence of normal skill availability. OpenCode loaded the implementation, TDD, review and conflict workflows; its availability does not establish Codex availability. `codex` is absent from PATH, and neither `~/.codex/skills` nor `~/.agents/skills` is present, so Codex runtime discovery cannot be confirmed. No skill configuration was changed.
- Non-blocking follow-ups observed in existing tooling/application checks: development i18next fallback parsing messages, deprecated TanStack router-devtools package notice, React-SWC plugin recommendation, and Storybook module API, absent-MDX and large-chunk warnings. These were not expanded into implementation scope.
- Limitations: no manual designer sign-off or pixel-comparison visual regression was performed; visual regression tests are explicitly out of scope. The approved PNG-derived token mapping is implemented.
