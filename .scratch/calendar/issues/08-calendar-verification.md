# 08: Calendar: final stories, full checks and browser verification

**What to build:** Bring the tickets together and verify them. The full set of stories exists, all repository checks pass, and a browser review of Storybook against the mock is recorded in `.scratch/calendar/verification.md`, in the same form as `.scratch/select/verification.md`. Parent spec: `.scratch/calendar/spec.md` (Testing Decisions → Stories, Checks).

**Blocked by:** 05 (limits), 06 (keyboard), 07 (forms)

**Status:** resolved

- [x] All stories listed in the spec exist:
  - [x] Days, Months, Years and No value
  - [x] Range, Draft range, and Range across a disabled day
  - [x] Min/max, Disabled dates, Spanish, and React Hook Form
  - [x] controls for `mode`, `minDate` and `maxDate`
- [x] A `composeStories` smoke test renders every Calendar story without errors.
- [x] `pnpm lint` (zero warnings), `pnpm test:unit`, `pnpm exec tsc --noEmit`, `pnpm build` and the Storybook build all pass. `git diff --check` is clean.
- [x] A browser review in Storybook (headless Playwright script kept outside the repo, as for Select) compares the Days, Months and Years stories with `.scratch/calendar/design/calendar-mock.png`, checking panel size, cell size, the colours of each state, Weekend blue and the grey days from other months. It also checks the range band across week rows, the today marker, keyboard flows and the Spanish story.
- [x] Any defect found gets its own follow-up ticket file (09 onward), which is fixed and then rechecked.
- [x] `verification.md` records the evidence, and marks designer sign-off (today marker, range band, disabled years, icon-button hover) and the Spanish native-speaker review as still pending.

## Comments

- Completed combined checks: 639 unit tests across 18 files, zero-warning lint, TypeScript, application/Storybook builds and whitespace checks. All public stories are composed in tests. Final browser review passed with zero page errors; screenshots inspected against the mock.
- Independent final spec review found two defects, resolved as 09 (controlled draft replacement) and 10 (keyboard preview on pointer exit), with red/green public regressions and combined rechecks. Standards review had no mandatory findings. Detailed evidence and pending human reviews: `../verification.md`.
