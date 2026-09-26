# 02: Button on Ink Blue

**What to build:** The primary Button renders in Ink Blue again. Rename every retired "brand" colour in the Button and its story to Ink Blue, keeping the same shade numbers: rest 700, hover 500, pressed 300, focus outline 500. Disabled and outlined Buttons now pick up Horaion's Neutral greys. Extend the compiled-stylesheet test so that any colour class the Button uses without a defined token fails a test. Parent spec: `.scratch/colour-tokens/spec.md`.

**Blocked by:** 01 (Colour tokens)

**Status:** ready-for-agent

- [x] The Button and its story no longer use "brand" anywhere. Each `brand-N` becomes `ink-blue-N` with the same N.
- [x] The Button's props, variants and non-colour classes are unchanged, and its existing tests pass unmodified.
- [x] The compiled-stylesheet test takes the colour utilities from the Button's real variant styles and asserts that each one produces CSS. It would have failed on the old `brand-*` classes.
- [x] In Storybook, the primary Button shows Ink Blue 700 at rest, and text links and hyperlinks show in Ink Blue.
- [x] `pnpm lint`, `pnpm test:unit` and `pnpm build` pass.
