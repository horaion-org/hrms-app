# Horaion icons

Import named icons from `@/components/ui/Icon`. They use the shared `Heroicon`
type, accept SVG props (including refs), inherit text colour, and have a 24×24
viewBox. Size them with CSS, for example `className="size-5 text-ink-blue-900"`.
Without a title they are decorative; `title` gives them an accessible image name.
`titleId` is optional and otherwise uses React's unique, stable `useId`.

`UI/Icon → Gallery` shows every design name in sheet order at 16, 24 and 32px.
One barrel test and one gallery cover the set, as approved for this generated
module. Each icon is an independent, side-effect-free export for tree shaking.

## Regeneration

Run `pnpm generate:icons` from the repository root. The generator, source sheet
and hand-written name manifest live together in `generator/`:

- `icon-sheet.svg` is the unmodified design export and the geometry source of truth.
- `manifest.json` maps outer array index + 1 to group, inner index + 1 to row.
  Labels are outlined paths in the sheet, so update names by checking the design
  preview rather than attempting to read text from the SVG.
- `catalogue.json` is generated: each design name with its export name, grouped
  as in the manifest. The gallery reads names from it; the barrel test derives
  names from the manifest on its own and checks the catalogue and exports match.
- `generate.mjs` uses Node built-ins to read the flat SVG export and the existing
  Prettier dependency/configuration to format output. It has no new dependencies.

The sheet's 24px cell origins are `(96 + groupIndex * 432, 36 + rowIndex * 80)`.
Paths are assigned by their initial absolute moveto, circles by their centre.
The 16px/32px drawings, outlined labels and white background are excluded.
A translation group places each drawing in its local viewBox without rounding
or rewriting curves. Stroke widths, caps, joins and fill rules are preserved;
stroke/fill colours become `currentColor`, retaining `none`.

The reader intentionally supports this sheet's flat paths and circles, not
arbitrary SVG. It rejects unsupported elements/attributes, changed sheet bounds,
duplicate/missing manifest names (the design has 77) and empty cells before
writing output. If the export layout or structure changes, update the reader and
inspect the gallery.

Generated components, `index.ts` and `catalogue.json` must be checked in with the source sheet.
Do not edit them by hand. Regenerating unchanged inputs must be byte-identical.
Run `pnpm lint`, `pnpm test:unit --run` and `pnpm build` after regeneration.
