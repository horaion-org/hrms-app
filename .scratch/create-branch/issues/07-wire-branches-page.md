# 07: Branches page: open the Dialog, gate the button, end-to-end

**What to build:** `src/pages/Branches.tsx` passes `onCreate` to `ListToolbar` only when the Current Company grants both `branch:create` and `company_member:read`, and renders `CreateBranchDialog`. Covered end to end by Playwright. Parent spec: `.scratch/create-branch/spec.md` (D5, D8, D12).

**Blocked by:** 06

**Status:** ready-for-human

- [x] *(Confirmed)* `ListToolbar` hides the Create button when `onCreate` is absent, rather than rendering a button that does nothing. Check the other list pages (Departments, Job titles, System roles) and keep their current behaviour explicit.
- [x] Permissions come from `companyPermissions(workspace, companyId)`, as `useOrganisationList` does.
- [x] Focus returns to the Create button when the Dialog closes. After a create, the new row is visible once the list refetches.
- [x] *(Confirmed, spec D12)* `organisation.branches.create`, `.name`, `.search` and `.all` change to sentence case in English and Spanish.
- [x] Unit tests: button hidden without either permission, shown with both; clicking opens the Dialog.
- [x] Playwright: log in → Organisation → Branches → Create branch → type a name → choose a head → create → the row appears.
- [x] `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e` and `pnpm build` pass.
- [x] `npx repomix@latest` regenerated in `app/`.

## Comments

- 2026-10-04: Confirmation received: hide dead Create actions on all list pages, sentence-case Branches labels. Other list expectations updated explicitly (Departments/Job Titles/System Roles now have no Create action). Permissions derived with companyPermissions at current-company scope; both grants required. Dialog keyed by company ID. Public page seam14 tests and existing list12 tests green; create refetch row and close-focus/reset covered. Organisation focused82 tests and targeted ESLint pass. Playwright/full checks/repomix owned by parent integration pass.

### Parent final integration verification

- All app checks pass: ESLint zero warnings, Vitest **73 files / 1186 tests** (bounded `--maxWorkers=2`), production TypeScript/Vite build, Storybook production build, and **48 Playwright tests** across Chromium, Firefox and WebKit (two workers). No timeout/configuration relaxation. See `../verification.md` for limits and API evidence.
