# 06: CreateBranchDialog: form, validation, submit and refusals

**What to build:** `src/features/organisation/CreateBranchDialog`, which composes Dialog, stacked FormRow, Input, Combobox and Button(loading) into the design's four states. It uses React Hook Form with a Zod resolver and submits through `useCreateBranch`. Parent spec: `.scratch/create-branch/spec.md` (D4, D6, D7, D8, D9, D11, D12).

**Blocked by:** 01, 02, 03, 04, 05

**Status:** ready-for-human

- [x] Title "Create branch". Description "Add a branch to your organisation and choose who heads it."
- [x] Branch name field:
  - Placeholder "e.g. Orchard Road", `maxLength` 100.
  - Helper "2–100 characters. Letters, numbers, spaces and . ' & - only.", with a "{{n}}/100" counter.
- [x] Branch heads field:
  - Combobox placeholder "Select branch heads", search placeholder "Search people".
  - Options show Avatar initials, the display name, and a Success Badge reading "Active".
  - Footer per D10.
  - Helper "Heads lead the branch. Add at least 1, up to 20.", with a "{{n}}/20" counter. `maxSelected` is 20.
- [x] Footer has Cancel (secondary) and Create branch (primary, `type="submit"`).
  - Submit is disabled while both fields are empty.
  - Validation runs on submit, then re-validates on change.
- [x] Zod errors:
  - Name pattern: "Use only letters, numbers, spaces and . ' & - in the name."
  - Name length: "Use 2 to 100 characters."
  - Heads empty: "Choose at least one branch head."
- [x] While submitting:
  - Create branch is `loading` and both fields are disabled.
  - The Dialog has `preventClose`.
- [x] Refusals, mapped by `refusalFor` per D7. The Dialog stays open, and the first errored field gets focus.
  - `409 BRANCH_NAME_CONFLICT` goes on the name field, with the name quoted.
  - `400 INVALID_INITIAL_BRANCH_HEAD` goes on the heads field and refetches the options.
  - `400` with `fieldErrors` goes to the matching fields.
  - 403 and other errors show a translated form alert in the body.
- [x] Success, close and reset:
  - On success: `onClose()`, form reset.
  - Cancel, × and Esc discard immediately.
  - Reopening shows state 1.
- [x] All strings are under `organisation.branches.createDialog.*` in English and Spanish, in sentence case.
- [x] Stories: states 1–4 from the design, plus submitting and a form-level error (stubbed API).
- [x] Unit tests cover the spec's CreateBranchDialog testing decisions, plus `refusalFor` on its own.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

- 2026-10-04: Implemented after Dialog/FormRow/Button/Combobox readiness. Fourteen public Branches-page tests cover permission gates, empty/focus/disabled, cancel/reset/restore, submit-first validation and on-change recovery, trimmed create/list refresh, pending lock, conflict/stale-head/known400/403/500/network refusals, first-error focus, refreshed people, debounced search/footers, retained Tokens and20-head cap. Pure schema9 + refusal7 tests green. Organisation total82 tests green; targeted ESLint zero warnings. English exact-copy aligned with spec; Spanish supplied as draft for language review. Six stories use stubbed API and public interactions for empty/name/choosing/selected/submitting/form-error states. Full-repo/browser checks coordinated by parent; no toast, dependency or transport changes.

### Parent final integration verification

- All app checks pass: ESLint zero warnings, Vitest **73 files / 1186 tests** (bounded `--maxWorkers=2`), production TypeScript/Vite build, Storybook production build, and **48 Playwright tests** across Chromium, Firefox and WebKit (two workers). No timeout/configuration relaxation. See `../verification.md` for limits and API evidence.
