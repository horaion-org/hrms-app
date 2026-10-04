# 05: Organisation API: create branch and search company members

**What to build:** Two API functions in `src/features/organisation/api.ts`, each parsed with Zod. `createBranch(companyId, body)` posts to `/api/v1/companies/{companyId}/branches`. `searchCompanyMembers(companyId, { search, status, size })` reads `/api/v1/companies/{companyId}/members`. Also `useCreateBranch` (the app's first `useMutation`), which invalidates `["organisation", companyId]` on success. Parent spec: `.scratch/create-branch/spec.md` (D8, D10).

**Blocked by:** API plan §2 (`status` / `search` on the members endpoint) for the search half. `createBranch` is unblocked.

**Status:** ready-for-human

- [x] `createBranch` sends `{ name: trimmed, initialHeadCompanyMembershipIds }` and parses the `Branch` response. A non-2xx response throws `ApiProblemError` (existing `apiRequest`).
- [x] `searchCompanyMembers` sends `status=ACTIVE`, `size=20` and `sort=user.displayName`, adds `search` only when it isn't blank, and parses `{ content: [{ membershipId, displayName, status }], page: { totalElements } }` as `PagedResponse` is parsed elsewhere.
- [x] A query hook `useCompanyMemberSearch(query)` debounces by 250 ms and keys on `["organisation", companyId, "members", "ACTIVE", query]`. It uses `placeholderData: keepPreviousData` so options don't flash empty while typing.
- [x] `useCreateBranch` invalidates `["organisation", companyId]` on success.
- [x] Unit tests use `stubApi` for both request shapes, Zod rejecting a malformed response, the blank search being omitted, the debounce (fake timers), and invalidation.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

- 2026-10-04: Search half completed after API worker confirmed §2 readiness. TDD: client3 + hook1 initially red, now API6/hook2/mutation1 green. Search response Zod-parsed with existing envelope, size20/ACTIVE/displayName sort, trimmed blank omission. Debounce250ms keeps prior options only within the same company; cross-company rerender regression initially red and now green (no stale people). Owner dialog also keyed by company ID. Organisation focused suite: 10 files / 82 tests pass; targeted organisation+Branches ESLint zero warnings. Full-repo checks delegated to parent integration pass.

- 2026-10-04: Create half implemented first, while search waits for API §2 readiness. TDD: `api.test.ts` failed for absent createBranch (3 tests), mutation test failed for absent hook; both now pass (4 tests total). Tests cover trimmed POST body, typed refusal, malformed payload and company-scoped invalidation of lists/counts. Targeted ESLint passes. `tsc --noEmit` currently reports only parallel Combobox/FormRow work in progress. Live controllers and apiRequest both use the existing envelope; preserved this verified contract per parent correction. No dependencies or shared transport changes.

### Parent final integration verification

- All app checks pass: ESLint zero warnings, Vitest **73 files / 1186 tests** (bounded `--maxWorkers=2`), production TypeScript/Vite build, Storybook production build, and **48 Playwright tests** across Chromium, Firefox and WebKit (two workers). No timeout/configuration relaxation. See `../verification.md` for limits and API evidence.
