# Spec: Horaion colour tokens

Status: ready-for-agent

## Problem Statement

The Horaion design defines a complete colour system: the Base colours (Black and White) and six colour ranges (Neutral, Ink Blue, Porcelain, Success, Warning, Error), each with ten shades from 50 to 900 and a marked default shade. None of it exists in the codebase. The app's Tailwind entry only imports Tailwind, so developers cannot use the design's colours by name.

The gap is already causing a defect. The Button component styles itself with `brand-*` classes, but no `brand` colour is defined. Tailwind silently produces no CSS for them, so the primary Button renders with no background, and its hover, pressed and focus colours are missing too. Its `neutral-*` classes also resolve to Tailwind's stock greys instead of Horaion's Neutral range. Nothing in the build or the tests caught this: an undefined colour class fails silently.

The code also uses a different word from the design. The code says "brand" where the design says "Ink Blue".

## Solution

Define every colour in the design as a Tailwind theme token, named with the design's own words, so `bg-ink-blue-700`, `text-error-600`, `border-neutral-300` and the like work everywhere. Each colour range also gets a plain name for its default shade (`bg-success` means Success 600). Neutral fully replaces Tailwind's stock neutral. Tailwind's other stock colours remain available.

Move the Button from `brand-*` to `ink-blue-*` so the primary Button renders in Ink Blue again. Add a test that compiles the app's real stylesheet, so a missing or misnamed colour token fails a test instead of shipping silently.

## User Stories

1. As a developer, I want to write `bg-ink-blue-700` and get Ink Blue 700, so that I can apply the primary colour range without looking up hex values.
2. As a developer, I want every Ink Blue shade from 50 to 900 available as a utility, so that I can express rest, hover, pressed and tint states from one colour range.
3. As a developer, I want every Porcelain shade from 50 to 900 available, so that I can add warm depth to surfaces and supporting elements.
4. As a developer, I want every Neutral shade from 50 to 900 available, so that I can build hierarchy with backgrounds, dividers, borders, disabled states and secondary text.
5. As a developer, I want every Success shade from 50 to 900 available, so that I can show positive outcomes and confirmations.
6. As a developer, I want every Warning shade from 50 to 900 available, so that I can flag potential issues before an action.
7. As a developer, I want every Error shade from 50 to 900 available, so that I can show critical issues, failed actions and missing inputs.
8. As a developer, I want `bg-ink-blue` to mean Ink Blue's default shade (900), so that I can use the identity colour without choosing a number.
9. As a developer, I want `bg-porcelain` to mean Porcelain's default shade (50), so that the common warm surface tint is one short class.
10. As a developer, I want `text-neutral` to mean Neutral's default shade (900), so that default text colour is one short class.
11. As a developer, I want `success`, `warning` and `error` without a number to mean shade 600, so that feedback colours come out consistent without memorising shades.
12. As a developer, I want `black` and `white` to be exactly `#000000` and `#FFFFFF`, so that the Base colours match the design.
13. As a developer, I want `neutral-*` to give Horaion's greys and not Tailwind's, so that greys match the design everywhere.
14. As a developer, I want `neutral-950` to no longer exist, so that I cannot use a stock grey that isn't in Horaion's Neutral range.
15. As a developer, I want Tailwind's other stock colours (red, blue and so on) to stay available, so that existing and prototype code keeps working.
16. As a developer, I want the colour names in code to match the design (Ink Blue, Porcelain, Neutral, Success, Warning, Error), so that designers and developers use the same words.
17. As a developer, I want the colour tokens kept in their own stylesheet, apart from global styles, so that I know where to find and change them, and so that type and spacing tokens can join them later.
18. As a developer, I want the tokens to work in Storybook as well as the app, so that component stories render with the real colours.
19. As a user, I want the primary Button to show Ink Blue 700 at rest, so that key actions stand out.
20. As a user, I want the primary Button to lighten to Ink Blue 500 on hover and Ink Blue 300 when pressed, so that I get clear feedback when I interact with it.
21. As a keyboard user, I want the Button's focus outline to show in Ink Blue 500, so that I can see which control has focus.
22. As a user, I want text links and hyperlinks to show in Ink Blue, with the same hover and pressed shades, so that links look consistent with primary actions.
23. As a user, I want disabled and outlined Buttons to use Horaion's Neutral greys, so that inactive controls match the rest of the interface.
24. As a developer, I want a test to fail when a colour token is missing or has the wrong hex value, so that the colour system cannot drift from the design unnoticed.
25. As a developer, I want a test to fail when the Button uses a colour class that produces no CSS, so that the silent `brand-*` failure cannot happen again.
26. As a designer, I want the glossary to record the colour-range names, what they mean and the words to avoid, so that new work doesn't bring back "brand", "danger" or "grey".

## Implementation Decisions

- **Token source.** Colour tokens live in a new dedicated stylesheet holding a Tailwind 4 `@theme` block. The app's existing Tailwind entry imports it. The unused legacy `tailwind.config.js` is not used for tokens, because Tailwind 4 ignores it without an `@config` directive.
- **Naming.** Colour ranges use the design's names in kebab case: `ink-blue`, `porcelain`, `neutral`, `success`, `warning`, `error`. "Brand" is retired. There are no role aliases such as `primary` or `secondary`.
- **Shades.** Each colour range defines shades 50, 100 and 200 through 900 as `--color-<range>-<shade>`. The values, confirmed against the design:

  | Colour range | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 |
  |---|---|---|---|---|---|---|---|---|---|---|
  | Neutral | #FBFDFF | #F6F8FD | #F1F3F8 | #EDEEF3 | #CDCED3 | #B0B1B6 | #85868B | #707176 | #505156 | #2E2F33 |
  | Ink Blue | #E4F2FD | #BEDFFB | #95CCF8 | #6EB7F5 | #52A8F3 | #3C99F1 | #378BE3 | #3179D0 | #2C68BD | #234A9E |
  | Porcelain | #EFEBE8 | #D6CCC6 | #BBAAA1 | #9F897C | #8A6F5F | #765643 | #6A4D3C | #5B4133 | #4C352A | #3D281F |
  | Success | #E2F3F1 | #B8E1DB | #8BCEC4 | #61BAAD | #46AA9B | #389A8A | #348D7D | #2F7D6D | #2B6D5F | #225044 |
  | Warning | #F7F2E3 | #EDDDB7 | #E2C78A | #D8B15E | #D2A243 | #CC9433 | #C88A2E | #C27D28 | #BA7124 | #AE5E20 |
  | Error | #FBECEF | #F6CFD4 | #E19DA0 | #D3797C | #DC5D5F | #E1504A | #D24847 | #BF3F40 | #B23A3A | #A13331 |

- **Default shade.** Each colour range also defines an unnumbered token, `--color-<range>`, that refers to its default shade: Ink Blue 900, Porcelain 50, Neutral 900, Success 600, Warning 600, Error 600. The unnumbered token refers to the numbered token; it does not repeat the hex value.
- **Base.** Tailwind's stock `black` and `white` already equal `#000000` and `#FFFFFF`. They are not redefined.
- **Tailwind stock colours.** Stock colours are kept, except neutral. Neutral's namespace is cleared first (`--color-neutral-*: initial`), so neutral holds exactly Horaion's ten shades and stock `neutral-950` is gone.
- **Button.** Every `brand-<N>` class becomes `ink-blue-<N>` with the same shade number: rest 700, hover 500, pressed 300, focus outline 500. The Button's props and variants don't change. Its `neutral-*` classes stay as written; they now pick up Horaion's Neutral values, so disabled and outlined states will look a little different. This change is intended.
- **Button story.** The one `brand-*` class in the Button's story becomes `ink-blue-*` with the same shade.
- **Glossary.** The root domain glossary already records Colour range, Default shade, Base and every colour-range name, with the words to avoid. Use that vocabulary in code, stories and commit messages.
- **ADR.** None. Every choice here is cheap to reverse.

## Testing Decisions

- **What a good test looks like.** It checks what a consumer can observe: which CSS the app's real stylesheet produces for a given class. It doesn't check how the stylesheet is written. It must not assert on the stylesheet's layout, token order or comments.
- **Seam: the compiled app stylesheet.** One new Vitest test compiles the app's real Tailwind entry through Tailwind's compiler and inspects the generated CSS. This is the only new seam. jsdom unit tests can't see missing colours, because they never process CSS. It checks that:
  - every colour-range shade from 50 to 900 compiles to the hex value in the table above
  - every unnumbered default-shade class (such as `bg-ink-blue`, `bg-porcelain`, `bg-success`) resolves to the right numbered shade
  - `neutral-950` produces no CSS
  - every colour utility the Button uses produces CSS. The test takes the colour classes from the Button's real variant styles, so that adding an undefined colour class to the Button fails the test.
- **Existing Button tests.** They stay as they are. They check behaviour and layout classes, not colours, and the rename doesn't affect them.
- **Prior art.** The Button's Testing Library suite is the model for test structure and naming. No compiled-CSS test exists yet, so this one sets the pattern for future token tests.
- **Gates.** `pnpm lint` (zero warnings) and `pnpm test:unit` must pass. `pnpm build` must succeed.

## Out of Scope

- Type, spacing, radius, shadow and other non-colour tokens.
- Dark mode and theme switching, including Storybook's theme toggle setup.
- Role aliases (`primary`, `secondary`, `danger`) on top of the colour-range names.
- Removing Tailwind's other stock colours.
- A Storybook colour-palette or swatch page. A new component like that needs the human's approval under the component-inventory rule.
- Removing or repurposing the unused legacy Tailwind config file.
- Redesigning the Button's variants or states beyond the colour rename.

## Further Notes

- The hex values were transcribed from a design image and confirmed correct against the design. Copy them exactly. Don't "correct" any shade that looks out of step with its neighbours.
- In the design, a white dot on a swatch marks that colour range's default shade.
