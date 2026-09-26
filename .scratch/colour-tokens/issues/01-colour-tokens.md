# 01: Colour tokens

**What to build:** Every Horaion colour is available as a Tailwind colour token in both the app and Storybook, named in the design's words. Parent spec: `.scratch/colour-tokens/spec.md`.

- Every colour range (Neutral, Ink Blue, Porcelain, Success, Warning, Error) has shades 50 to 900 with the exact hex values from the spec's table.
- Each colour range has an unnumbered name for its default shade, which points to that numbered shade.
- Neutral fully replaces Tailwind's stock neutral.
- Tailwind's other stock colours and its Base colours (black, white) stay as they are.

Add the spec's compiled-stylesheet test, which runs the app's real Tailwind entry through Tailwind's compiler and checks the generated CSS. This ticket covers the token checks; ticket 02 adds the Button check.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] The tokens live in their own stylesheet, imported by the app's Tailwind entry, so Storybook picks them up too.
- [x] Every shade from 50 to 900 of every colour range compiles to the spec's hex value, e.g. `bg-ink-blue-700` gives `#3179D0`.
- [x] The unnumbered default-shade classes resolve correctly: `ink-blue` and `neutral` to 900, `porcelain` to 50, and `success`, `warning` and `error` to 600.
- [x] `neutral-950` produces no CSS.
- [x] A stock Tailwind colour outside neutral (e.g. `bg-red-500`) still produces CSS.
- [x] A Vitest test at the compiled-stylesheet seam asserts all of the above, only on the generated CSS and not on how the stylesheet is written.
- [x] `pnpm lint`, `pnpm test:unit` and `pnpm build` pass.
