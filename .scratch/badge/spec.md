# Spec: Badge

Status: ready-for-agent

## Problem Statement

The Horaion design defines a small rounded label for showing a record's state at a glance. It comes in four colours: teal, amber, red and grey. The design file calls it a "pill". The codebase has no such component: nothing in the shared ui, forms, layout or charts components, or in any feature folder, shows read-only state this way.

Without one, every list or table that needs to show a state (such as a leave request being approved, pending or rejected) would style its own span. Colours, casing, contrast and truncation would drift between screens. The word "pill" also already describes Button's rounded variants, so the design's wording would give one word two meanings in code.

## Solution

Add a reusable **Badge** (see `CONTEXT.md`) to the shared ui components. A Badge is a read-only label whose **Tone** (Success, Warning, Error or Neutral) sets its colours. Callers pass a tone and a short string. The Badge shows the text in uppercase on one line inside a fully rounded shape, and cuts long text off with an ellipsis while the full text stays available. Every tone meets WCAG AA text contrast. For Warning, this means the text is Neutral rather than orange as in the mock.

## User Stories

1. As a developer, I want a shared Badge, so that I stop hand-styling status spans on each screen.
2. As a developer, I want to import Badge through the `@/` alias from the shared ui components, so that it follows the shared import convention.
3. As a developer, I want to choose the colour with a `tone` prop taking "success", "warning", "error" or "neutral", so that the colour always carries meaning.
4. As a developer, I want `tone` to default to "neutral", so that a Badge with no stated tone doesn't claim good or bad news.
5. As a developer, I want `tone` typed as a closed union, so that the compiler rejects colours outside the design system.
6. As a developer, I want the tone values exported as a constant, so that stories, tests and callers can loop over them.
7. As a developer, I want `children` typed as a string, so that nobody can nest links, buttons or other interactive content in a read-only label.
8. As a developer, I want to write labels in normal case ("Approved"), so that translation strings stay natural and the Badge handles the capitals.
9. As a developer, I want other span attributes (`className`, `id`, `data-*`, `aria-*`) passed through, so that I can position the Badge and hook tests to it.
10. As a developer, I want the `className` I pass merged with the Badge's own classes, so that layout tweaks don't remove the tone styling.
11. As a developer, I want `ref` to reach the underlying span, so that the Badge works with measuring and tooltip utilities.
12. As a developer, I want to be able to override the automatic `title`, so that I can give a fuller description when needed.
13. As a user, I want Success Badges in Success colours, so that positive outcomes read as positive at a glance.
14. As a user, I want Warning Badges on the Warning tint, so that items needing attention stand out without looking urgent.
15. As a user, I want Error Badges in Error colours, so that failures and rejections read as critical.
16. As a user, I want Neutral Badges in grey, so that states with no good or bad meaning don't compete with the ones that have it.
17. As a user, I want Badge text in uppercase, so that Badges read as labels and not as body copy.
18. As a user, I want a Badge to stay on one line, so that its rounded shape never breaks in a table cell.
19. As a user, I want a label that is too long cut off with an ellipsis, so that it doesn't overflow its column.
20. As a user, I want to hover a cut-off Badge and see its full text, so that no information is lost.
21. As a low-vision user, I want every tone's text to meet WCAG AA contrast (4.5:1) on its background, so that I can read every Badge.
22. As a colour-blind user, I want the tone always spelled out in the Badge's text, so that I don't have to rely on colour.
23. As a screen-reader user, I want a Badge read as its plain text, so that it isn't announced as a control or a live region.
24. As a screen-reader user, I want to hear the label in normal case, so that uppercase styling isn't spelled out letter by letter.
25. As a keyboard user, I want Badges skipped in the tab order, so that read-only labels don't slow my navigation.
26. As a designer, I want Storybook stories for each tone, the default tone, and a truncated long label, so that I can review Badges against the mock.
27. As a maintainer, I want Badge to follow the standard component file set, so that it's as easy to find and test as Button.
28. As a maintainer, I want the glossary to name this concept Badge and list "pill", "chip" and "tag" as terms to avoid, so that design and code use the same word.

## Implementation Decisions

- **Name and location:** the component is called Badge, the glossary term, and lives in the shared ui components next to Button. It gets the full file set: component, constants, story, test and index re-export. It uses a named export, and its return type is the shared `FunctionComponent` type. Creating it was approved under the CLAUDE.md component gate.
- **Naming:** it is not called "Pill", because Button already uses "pill" for its rounded `primary` and `secondary` variants. The glossary now defines **Badge** and **Tone** in a new *Indicators* section.
- **Props:** Badge takes the native span props and adds:
  - `tone?: BadgeTone`, where `BadgeTone` is `"success" | "warning" | "error" | "neutral"` and comes from a const tuple in the constants file, following Button's variant constants. It defaults to `"neutral"`.
  - `children: string`, which is required.
- **Prop name:** the prop is `tone`, not `status`. Input and Select use `status` for validation state, which drives `aria-invalid`, and their `status` only covers success and error. A Badge's tone has no validation behaviour. It is also not `variant`, which Button uses for visual style rather than meaning.
- **Element and semantics:** Badge renders a plain `span` with no ARIA role. `role="status"` is deliberately left out because it would make every Badge in a table a live region. No screen-reader-only tone prefix is added, because the visible text already states the state.
- **Title:** `title` is set from `children` automatically so that truncated text can be read on hover. A `title` passed by the caller replaces it.
- **Shape and type:** fully rounded, uppercase through CSS, one line only (`whitespace-nowrap`), cut off with an ellipsis when the parent is narrower (the Badge can shrink, and it has `max-width: 100%` so the ellipsis can appear). There is one size, no icon slot and normal font weight.
- **Colours per tone** (all within existing Colour ranges; contrast is WCAG ratio):

  | Tone    | Background  | Text        | Contrast |
  | ------- | ----------- | ----------- | -------- |
  | success | Success 100 | Success 900 | 6.45:1   |
  | warning | Warning 100 | Neutral 900 | 9.95:1   |
  | error   | Error 100   | Error 900   | 4.88:1   |
  | neutral | Neutral 400 | Neutral 800 | 5.04:1   |

- **Warning contrast trade-off:** no Warning shade reaches 4.5:1 on Warning 100. Warning 900 manages 3.53:1, and 4.24:1 on Warning 50. So Warning text uses Neutral 900 and does not match the mock's orange. The ten-shade Colour range model is left unchanged. This is not recorded as an ADR because it's cheap to reverse if design supplies a darker Warning text colour.
- **Class merging:** caller classes are merged with the shared class-joining helper, as Button does.

## Testing Decisions

- **Seam:** there is one seam, the component's public props. Render `<Badge>` with Testing Library and check the resulting DOM. No other seam and no visual regression suite (confirmed with the user).
- **What makes a good test:** it checks what a caller or user can see, such as text, role or its absence, attributes, and the classes that encode each tone. It doesn't check internal structure or how the classes are put together. Tone checks look for each tone's background and text colour classes, as the Select tests check status border classes.
- **Cases to cover:**
  - renders its text inside a span, with no role and not focusable
  - defaults to the Neutral tone classes when `tone` is omitted
  - applies the matching background and text classes for each tone, as a parameterised test over the exported tone constant
  - sets `title` from `children`, and a caller-supplied `title` wins
  - applies the uppercase and single-line truncation classes
  - merges a caller `className` without losing tone classes
  - passes other span props and `ref` through to the span
- **Prior art:** the Button tests (rendering, then role and attribute checks) and the Select tests (parameterised status-to-class checks).
- **Checks:** `pnpm lint` (zero warnings) and `pnpm test:unit` must pass.

## Out of Scope

- Interactive variants: filter chips, toggles, removable tags with a close control. These would be separate form controls, not Badges.
- Leading or trailing icons.
- Size variants.
- Categorical colours that carry no meaning (such as department colours), and Ink Blue or Porcelain tones.
- Count or notification dots placed on other elements.
- Adding a darker Warning text shade to the colour tokens.
- Using Badge on any feature screen. This spec only delivers the shared component.

## Further Notes

- The mock is a PNG export (see the design folder beside this spec). It shows the four tones with placeholder text and doesn't specify sizes. The Badge is about 24px tall, with small (`text-sm`) text and about 12px of horizontal padding, which is inferred from the mock. Confirm exact sizes with a designer.
- The mock's text shades are lighter than the ones chosen for Success and Error, and orange for Warning. The darker shades are a deliberate accessibility change, not an implementation mistake.
