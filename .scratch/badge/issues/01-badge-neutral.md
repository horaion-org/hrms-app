# 01: Badge, Neutral, end to end

**What to build:** A developer can import the shared Badge from the shared ui components and render `<Badge>Pending</Badge>`. The user sees a read-only, fully rounded, uppercase label in the Neutral tone (Neutral 400 background, Neutral 800 text). Parent spec: `.scratch/badge/spec.md`. Glossary: **Badge** and **Tone** in `CONTEXT.md`.

This ticket creates the component's full file set (component, constants, story, test, index re-export), following Button's conventions: named export, `FunctionComponent` return type, imports through the `@/` alias, and the shared class-joining helper. The constants module exports the tone const tuple (`success`, `warning`, `error`, `neutral`) and the `BadgeTone` type. Only Neutral is styled here. Ticket 02 adds the other tones and ticket 03 adds truncation, so keep the tone-to-class mapping in a form that can be extended as a record.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Badge renders its `children` text in a `span` with no ARIA role, and the span isn't in the tab order.
- [x] `children` is typed `string` (required). `tone` is typed `BadgeTone`, is optional, and defaults to `"neutral"`.
- [x] Neutral tone: Neutral 400 background, Neutral 800 text (5.04:1 contrast).
- [x] Fully rounded, uppercase through CSS (the DOM text stays in the case the caller passed), normal font weight, about 24px tall, `text-sm`, about 12px horizontal padding (inferred from the mock; see the spec's Further Notes).
- [x] A caller's `className` is merged without dropping the Badge's own classes. Other span props (`id`, `data-*`, `aria-*`) and `ref` reach the span.
- [x] Storybook: a Default story.
- [x] Unit tests (Testing Library, modelled on Button's) cover the text, no role, not focusable, the default Neutral classes, the uppercase class with the DOM text unchanged, `className` merging, and prop and `ref` pass-through.
- [x] `pnpm lint` (zero warnings) and `pnpm test:unit` pass.

## Comments

### Implementation and verification — 2026-09-26

- Created `src/components/ui/Badge/{Badge.tsx,Badge.constants.ts,Badge.stories.tsx,Badge.test.tsx,index.ts}` after searching shared ui/forms/layout/charts and features for Badge, Chip, Tag, Pill and related prior art. Button supplied the nearest conventions; component creation was approved.
- Followed four red/green cycles at the approved public-props → DOM seam: plain span and keyboard skipping; default/explicit Neutral colours; uppercase styling with original DOM text; caller classes, attributes and ref. The first red was the missing public module; subsequent reds were missing observable classes. Targeted command `pnpm exec vitest run src/components/ui/Badge/Badge.test.tsx`: **4 passed**.
- `badgeTones` exports all four values and derives `BadgeTone`. The extendable partial record styles only Neutral. Tickets 02 and 03 were not implemented.
- Default Storybook story omits `tone`, exercising the default. Required string children, optional closed-union tone, native span props and React 19 ref support were reviewed in the public types.
- Sizing uses `inline-block`, `leading-6` (24px at the default root size), `text-sm` and `px-3` (12px horizontal padding). These are the spec's inferred dimensions, **not designer-confirmed measurements**; exact sizing still needs designer confirmation. No browser/visual verification is claimed.
- `pnpm install --frozen-lockfile`: passed, dependencies installed without lockfile changes.
- Final `pnpm lint`: passed, zero warnings (initial test prop-order errors corrected).
- Final `pnpm test:unit --run`: **13 files, 454 tests passed**.
- Final `pnpm exec tsc --noEmit`: passed.
- `pnpm exec prettier --check src/components/ui/Badge`: passed.
- Local standards/spec review completed without subagents: no outstanding findings for ticket 01. No implementation blockers. No staging, commits or pushes performed.

### Final integration

- All three tickets integrated; combined lint, 463 unit tests and production build passed. Chromium confirmed inferred height/padding. Final two-axis review and prerequisite findings: [verification](../verification.md).
