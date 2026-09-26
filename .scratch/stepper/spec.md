# Spec: Stepper

Status: ready-for-agent

## Problem Statement

The Horaion design defines a stepper: a horizontal row of numbered circles joined by connectors, each with a label, that shows a person where they are in a multi-step flow. The only design frame (`design/stepper.png`) shows the schedule-generation flow (Setup, Shifts, Constraints, Forecast, Generate) with Setup as the current step: a filled Ink Blue circle with an Ink Blue label. The other steps are upcoming and shown as grey outlined circles with grey labels. The purple dashed border in the frame is the Figma frame, not part of the component.

The codebase has no stepper, wizard or progress component. So any flow that walks a person through ordered steps would need a hand-built indicator. Those would drift from the design and from each other. They would also be likely to get the semantics wrong: announcing the current step, marking completed steps, and letting a person go back but not skip ahead. The frame also never shows a completed step, so each hand-built version would invent its own.

## Solution

Add a reusable stepper to the shared UI components, made of two parts: `Stepper`, the ordered container that knows which step is current, and `StepperStep`, one labelled step. The caller lists the steps as children in order and passes the index of the current step. Each step's number and status (completed, current or upcoming) come from its position. Callers can't produce an inconsistent state.

The stepper is only an indicator. It shows progress and, when the caller opts in, lets a person click a completed step to go back to it. Moving forward stays with the page's own Back and Next actions. The stepper fills its container's width, with connectors that grow to fill the space between steps. In a narrow container, only the current step's label stays visible.

## User Stories

1. As a developer, I want a shared stepper component, so that I stop hand-building progress indicators for multi-step flows.
2. As a developer, I want to import `Stepper` and `StepperStep` through the `@/` alias from one UI components entry point, so that it follows the same import convention as every other shared component.
3. As a developer, I want to compose the stepper from `Stepper` and `StepperStep` children, so that the call site reads like the steps it renders.
4. As a developer, I want to give each step a `label`, so that the stepper names each stage of my flow.
5. As a developer, I want to pass `currentStep` as a zero-based index, so that I control which step is current from my own flow state.
6. As a developer, I want step numbers to come from the order of the children, so that I never have to number steps by hand or keep numbers in sync when I reorder them.
7. As a developer, I want each step's status to come from `currentStep`, so that I can't accidentally mark two steps current or an upcoming step completed.
8. As a developer, I want to pass `currentStep` equal to the number of steps, so that I can show a finished flow where every step is completed.
9. As a developer, I want to pass an optional `onStepClick` handler that receives the clicked step's index, so that I can go back to a completed step using my own routing or state.
10. As a developer, I want completed steps to stay non-interactive when I pass no `onStepClick`, so that a display-only stepper never shows clickable affordances that do nothing.
11. As a developer, I want the stepper to fill its container's width, with the `className` I pass going on the root, so that I can size and place it in a layout the same way as Input and OverflowMenu.
12. As a developer, I want the stepper to adapt to the width of its container rather than the viewport, so that it works on a full page, in a side panel, or in a modal.
13. As a developer, I want the stepper to leave Back and Next actions to me, so that my page can validate, save or rename the final action (such as "Generate") before moving on.
14. As a user, I want the current step shown as a filled Ink Blue 900 circle with a white number and an Ink Blue label, so that I can see where I am in the flow.
15. As a user, I want upcoming steps shown as grey outlined circles with grey numbers and labels, so that I can see what's still ahead.
16. As a user, I want completed steps shown as Ink Blue 900 outlined circles with a tick instead of the number and a Neutral 900 label, so that I can tell what I've finished apart from where I am now.
17. As a user, I want connectors between steps in Neutral 300, so that the steps read as one ordered sequence.
18. As a user, I want the connectors leading up to the current step shown in Ink Blue, so that I can see how far I've come at a glance.
19. As a user, I want every step completed when the flow is finished, with no step current, so that I can see I'm done.
20. As a user, I want to click a completed step to go back to it, when the page allows it, so that I can revise earlier answers.
21. As a user, I want clicking the current or an upcoming step to do nothing, so that I can't skip past steps I haven't finished.
22. As a user, I want a clickable completed step to turn Ink Blue 500 on hover and Ink Blue 300 when pressed, with a pointer cursor, so that I know it's clickable, the same way a text link responds.
23. As a user in a narrow space, I want only the current step's label shown next to the circles and connectors, so that the stepper stays on one line without overflowing.
24. As a keyboard user, I want to tab to each clickable completed step and skip the current and upcoming steps, so that I only stop on steps I can act on.
25. As a keyboard user, I want Enter or Space on a focused completed step to go back to it, so that I can navigate without a mouse.
26. As a keyboard user, I want a visible Ink Blue 500 focus ring on a focused step, matching Button, so that I always know where focus is.
27. As a screen-reader user, I want the stepper announced as navigation with an ordered list of steps, so that I know how many steps there are and where each one sits.
28. As a screen-reader user, I want the current step marked as the current step, so that I hear where I am.
29. As a screen-reader user, I want completed steps announced as completed, so that I know what I've already finished even though the tick isn't read.
30. As a screen-reader user, I want every step's label announced even when it's visually hidden in a narrow container, so that I get the full sequence at any width.
31. As a screen-reader user, I want decorative parts (circles, the tick, connectors) hidden from me, so that I hear each step's number, label and status only once.
32. As a designer, I want 48px circles, base-size labels, and 1px connectors that grow to fill the width, so that the component matches the frame.
33. As a designer, I want Storybook stories for first step current, a middle step current, all steps completed, clickable completed steps, and a narrow container, so that I can review every state against the design.
34. As a designer, I want Storybook controls for `currentStep` and the step labels, so that I can try combinations interactively.
35. As a maintainer, I want the component to follow the standard nested component file set, like OverflowMenu and OverflowMenuItem, so that it's as easy to find and test as the other shared components.
36. As a maintainer, I want the terms Stepper and Step used as defined in `CONTEXT.md`, so that product, design and code use the same words.

## Implementation Decisions

- **Placement.** It's a shared UI primitive, not bound to a feature. It's split into a `Stepper` part and a `StepperStep` part, each with the standard component file set, plus one entry point that re-exports both. The structure mirrors OverflowMenu.
- **Vocabulary.** "Stepper" and "Step" as defined in `CONTEXT.md`. Avoid "wizard", "progress bar", "progress indicator" and "breadcrumb".
- **Public interface.**
  - `Stepper` takes `currentStep` (a zero-based index), an optional `onStepClick(index)`, an optional `className` (applied to the root), and `StepperStep` children.
  - `StepperStep` takes a `label`. It has no status or number prop: both come from its position among the Stepper's children, which the Stepper passes down (for example through context).
- **Status rule.** For a step at index `i`: completed if `i < currentStep`, current if `i === currentStep`, upcoming if `i > currentStep`. A `currentStep` equal to the step count means every step is completed and none is current. Values outside `0..count` aren't a supported input.
- **Three statuses only.** There is no error or invalid status. Validation problems surface on the step's own page.
- **Navigation rule.** Only completed steps are interactive, and only when `onStepClick` is provided. They then render as buttons. Current and upcoming steps are never interactive. Without `onStepClick`, completed steps are inert.
- **Scope.** The stepper is only an indicator. It doesn't render Back or Next actions and doesn't own the flow's state.
- **Semantics.**
  - The root is a navigation landmark wrapping an ordered list, with one list item per step.
  - The current step carries `aria-current="step"`.
  - Completed steps include "completed" in their accessible name.
  - Circles, the tick icon and connectors are decorative and hidden from assistive technology.
- **Visuals (Horaion tokens).**
  - **Current:** Ink Blue 900 filled circle with a white number and an Ink Blue label.
  - **Upcoming:** Neutral 300 outlined circle with a Neutral 500 number and label.
  - **Completed:** Ink Blue 900 outlined circle with the existing tick icon and a Neutral 900 label.
  - **Connectors:** 1px Neutral 300. Connectors between completed steps and up to the current step are Ink Blue 900.
  - **Clickable completed steps:** hover to Ink Blue 500, active to Ink Blue 300, pointer cursor.
  - **Focus ring:** Ink Blue 500, matching Button.
- **Sizing.** One size only: 48px circles and base-size text. Connectors grow to fill the container width. No size prop.
- **Narrow layout.** A container query on the Stepper root, not a viewport breakpoint, with the threshold at Tailwind's `@2xl` container size (42rem). Below it, only the current step's label stays visible, or the last step's label when every step is completed. The other labels are visually hidden but stay in the accessible name. Horizontal orientation only.

## Testing Decisions

- A good test drives the component the way a caller and a user would: render it, then query by role, name and state (`aria-current`, button roles, accessible names) and interact with user-event. It never asserts on internal context, class names or markup structure.
- **One seam:** the composed `<Stepper>` with `<StepperStep>` children, imported through the public entry point. `StepperStep`'s required test file also renders inside a `Stepper`, because status and numbering only exist in composition.
- **Behaviours to cover:**
  - Steps render in order as a numbered list inside navigation.
  - Exactly the step at `currentStep` has `aria-current="step"`.
  - Steps before it are announced as completed.
  - Passing the step count marks every step completed with no current step.
  - With `onStepClick`, completed steps are buttons that call it with their index on click, Enter and Space, while current and upcoming steps aren't buttons.
  - Without `onStepClick`, no step is a button.
  - Tab order visits only the clickable completed steps.
  - Every label stays in the accessible tree (the narrow-layout guarantee).
- **Narrow layout:** hiding labels in a narrow container is checked visually through a "Narrow container" Storybook story, not a unit or e2e test, because jsdom can't evaluate container queries.
- **Prior art:** the OverflowMenu and Sidebar tests (Testing Library with user-event, role-based queries through the `@/` entry point).

## Out of Scope

- A vertical orientation.
- An error or invalid step status.
- Size variants.
- Back and Next actions, and flow state or validation.
- Clicking forward to upcoming steps.
- The schedule-generation flow itself. The frame's step labels are only story and example data.
- Playwright coverage.

## Further Notes

- Design frame: `design/stepper.png`. It shows only the current and upcoming states. The completed state, hover and press states, and narrow layout were decided in grilling and aren't yet drawn, so they should be reviewed with design in Storybook.
- No ADR was recorded. Each decision is cheap to reverse.
