# 01: Horaion icons, generated from the design sheet

**What to build:** Every icon in the design's icon sheet is available as a named React component from the Icon module. A developer can drop `LeaveFilledIcon` or `ChevronDownIcon` anywhere a Heroicon fits, colour it with text utilities and size it with CSS. One script turns the committed sheet into those components, so when the design changes, the code catches up in one command. Designers can check the whole set in a Storybook gallery. Parent spec: `.scratch/sidebar/spec.md` (see "Icon module" and "Icon generator").

The design inputs are in `.scratch/sidebar/design/`. `icon-sheet.svg` is the generator's input, to be committed next to the generator. `icon-sheet-preview.png` is a rendered preview with labels, for checking the name manifest.

**Blocked by:** None (can start immediately)

**Status:** completed

- [ ] The icon sheet is committed as the generator's single source of truth, alongside a hand-written manifest that maps each grid cell to its design name, with all 77 names in the spec's order.
- [ ] One package script regenerates every icon component and the Icon module's barrel exports from the sheet and manifest.
- [ ] Each icon is a named export `<PascalName>Icon` (e.g. `leave-filled` becomes `LeaveFilledIcon`) and uses the shared `Heroicon` type.
- [ ] Each icon is taken from the sheet's 24px column and translated into `viewBox="0 0 24 24"`, keeping the source's stroke width, caps and joins. Labels and the sheet background are dropped.
- [ ] Every hard-coded colour becomes `currentColor`, and `fill="none"` stays as it is.
- [ ] With no `title`, the SVG is `aria-hidden="true"`. With a `title`, it has `role="img"`, a `<title>` and `aria-labelledby` (using `titleId` if given, otherwise a generated id). `className` and other props reach the `<svg>`.
- [ ] Generated files are formatted with the repo's Prettier config, ordered by manifest and marked as generated. Running the script again on an unchanged sheet leaves the working tree clean.
- [ ] Heroicons stays a dependency and its current uses are untouched.
- [ ] The Icon module follows the component folder conventions. One barrel test runs through the manifest and checks, for each icon: the export exists, the viewBox is 24×24, at least one element is drawn, the only colours are `currentColor` or `none`, the `aria-hidden`/`title` behaviour is right, and `className` passes through.
- [ ] One Storybook gallery story shows every icon with its design name.
- [ ] `pnpm lint` (zero warnings), `pnpm test:unit` and `pnpm build` pass.

## Comments

### Implementation verified — 2026-09-25

All implementation criteria above are verified on `feat/sidebar-icons`. The source-sheet criterion's literal commit is deferred under the user's explicit no-stage/no-commit instruction: the byte-identical SVG, manifest, generator and output are present in the working tree and ready for a later authorized commit. Checklist wording is preserved to distinguish that from an actual commit.

- Delivered 77 `Heroicon`-typed named components, the barrel, gallery, manifest and `pnpm generate:icons` under `src/components/ui/Icon/`.
- Barrel tests cover exports, geometry, colours, decorative/titled accessibility, unique/explicit title IDs, props and refs. Browser audit matched all 180 drawing elements to the source's 24px cells.
- Regeneration was byte-identical across all 78 generated files. A production tree-shaking audit retained only the imported icon.
- Standards and spec self-review completed, with no unresolved findings. Integrated with ticket 02 and then ticket 03.
- Final combined checks: lint passed with zero warnings; `pnpm test:unit --run` passed (337 tests, 6 files); app and Storybook builds passed. Commands used `--config.verify-deps-before-run=false` with the installed dependencies.
- Gallery browser evidence: `/tmp/opencode/horaion-icons-01-gallery.png`.
- Shared prerequisite findings and limitations: see `../verification.md`.
