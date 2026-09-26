# 01: Count badge

**What to build:** A standalone Count badge UI primitive. It's a small pill showing how many items wait behind a label. It shows nothing for a count of 0 or no count, shows 1 to 99 as they are, and shows `99+` above that. It has three tones: active (Ink Blue 900 fill, white text), inactive (Neutral 300 fill, Neutral 800 text) and disabled (Neutral 200 fill, Neutral 400 text). It's a rounded pill with a 20px height and minimum width and `text-xs` digits. Other `span` props pass through. Parent spec: `.scratch/tabs/spec.md` (Count badge module).

**Blocked by:** None (can start immediately)

**Status:** completed

- [x] Count badge lives in the shared UI components area with the full component file set (component, stories, test, barrel), using a named export and the shared `FunctionComponent` return type
- [x] `0` and `undefined` render nothing
- [x] 1 to 99 render the number and 100 or more render `99+`
- [x] Active, inactive and disabled tones render the agreed colours
- [x] `className` and other `span` props reach the element
- [x] Stories show each tone plus the counts 0, 5 and 150
- [x] The compiled-stylesheet test covers every colour class Count badge uses
- [x] `pnpm lint`, `pnpm test:unit` and `pnpm build` pass

## Comments

- Implemented in `/tmp/opencode/tab-01`: full `CountBadge` quad, count-only span API, Tailwind sizing and tone styles, and five stories (Active, Inactive, Disabled, Zero, Capped). Children are omitted from span props because the count owns the content.
- Searched components (including ui, forms, layout and charts) and features for badge/chip/pill/count concepts before implementation; no reusable Count badge existed.
- TDD at the approved standalone seam: initial missing-export failure → 1 passing test; zero/undefined produced unwanted spans → 3 passing tests; 100/150 displayed uncapped → 7 passing tests; missing className/span attributes → 8 passing tests. No mocks.
- Extended the existing compiled-stylesheet seam: all three tone cases failed before colour styles, then passed with all six colour utilities checked against the agreed hex values. Tailwind emits White as `#fff`; the assertion uses that equivalent representation. Focused final run: 101 tests passed across the component and stylesheet suites.
- Verification: `pnpm install --frozen-lockfile` succeeded; `pnpm lint` passed with zero warnings after correcting test prop order; `pnpm test:unit --run` passed (10 files, 390 tests); `pnpm build` passed (TypeScript and Vite). Prettier check for changed source files and `git diff --check` passed.
- Self-review against ticket acceptance, Count badge spec, CLAUDE.md and component READMEs found no outstanding standards or spec issues. Colours remain the agreed provisional values. Stories were not manually inspected in a browser; no visual-review claim is made. Changes are unstaged for coordinator integration.
