# Create branch implementation verification

## Coordination and approvals

- Work performed on the existing `feat/organisation-overview` branches, with exactly five delegated workers. No commits, pushes, PRs, branch changes or new project dependencies.
- User approved sentence-case Branches labels, hiding toolbar Create without `onCreate`, and shared Button loading. Canonical spec updated to record these decisions.
- Existing success envelopes are preserved: live controllers return `ApiResponse`, and the frontend validates that envelope before validating its data. Older general guidance is not used to change the contract.
- API plan sections 1 and 2 serve as API work items. API worker owns migration, security tests and evidence.

## Browser baseline / red

- Added `e2e/create-branch.spec.ts` through the public browser/network seam. Chromium logged in and navigated Organisation → Branches, then failed on the not-yet-implemented sentence-case Create action. This is the expected red baseline, not a passing feature check.
- Existing tests run with two workers across Chromium, Firefox and WebKit: 42 passed, three failed (same onboarding assertion per browser).
- Investigated the onboarding failure: `CreateOnboardingRequest` does not accept `registrationNumber`; `registerCompany` intentionally omits it and its unit test asserts the accepted properties. Corrected the stale E2E expected POST body only; no onboarding application behavior changed.
- After correcting the stale assertion, all **45 existing browser tests passed** across Chromium, Firefox and WebKit (two workers).
- An initial full-suite invocation passed an extra `--` through pnpm and ignored the requested CLI flags, so its oversubscribed run is not final evidence. Subsequent runs invoke Playwright directly with bounded workers.

## Visual verification constraints

- `read_image` failed on the supplied mocks with `cannot get property "fs" without inject`; no screenshot review is claimed. The HTML design sources remain readable and supply dimensions/colors/layout.
- Ran live Storybook at http://localhost:6006 with Chromium using `check-stories.mjs`. Found a zero-height Dialog role root (fixed descendants inside a relative root); worker fixed the root to `fixed inset-0`. Recheck passed: desktop panel width 560px; mobile 390px viewport gives x=16/width=358; tall body at 640px height gives panel height608/body client370/scroll1464/footer bottom624. Prevent-close Escape remains open; stacked FormRow label bottom40 precedes input top60 and helper ID is connected; zero browser page errors. Screenshots saved under `design/dialog-browser-default.png` and `design/dialog-browser-mobile-long.png` for human visual review.
- Extended browser checks pass: backdrop dismisses default Dialog, neither backdrop nor Escape dismisses prevent-close Dialog. Loading Button retains exact width (primary162.265625px, secondary164.265625px), is disabled and aria-busy, and computes spinner animation `none` under reduced motion.

## Intermediate regression checks

- Unbounded Vitest oversubscribed workers and produced broad 5s timeouts in unchanged tests while feature tests were still intentionally RED. Bounded rerun `pnpm exec vitest run src --maxWorkers=2 --exclude '**/CreateBranchDialog.test.tsx'` passed **67 files / 1164 tests**. Full final rerun will include the feature once ready; no timeouts/configuration weakened.

## Integration review and API evidence

- Independent final feature review found no remaining defects in lifecycle, refusal mapping, 20-head cap, debounce, permission gating or cross-company cache isolation.
- Browser testing caught Headless UI Fragment prop-forwarding failure, then native Combobox anchoring to the popup search rather than trigger. Replaced the unsupported composition with real forwarding wrappers and dependency-free trigger positioning; final geometry recheck pending below. Do not count intermediate concurrent-edit runs as final regression evidence.
- API cross-review found soft-deleted memberships/users could be chosen as initial heads through an existing ACTIVE-only resolver. Branch-path guard and failing-then-passing regressions added; no shared auth exemptions widened.
- API real PostgreSQL17 proofs passed: fresh Flyway V1–V9; V8→V9 whitespace normalization; named case-insensitive unique index; collision transaction rollback; real Hibernate/Spring Data optional filter combinations, literal `%`/`_`/backslash, tenant scope, no email search, deleted membership/user exclusion. Disposable no-volume container removed; existing databases untouched. See API `.scratch/create-branch/postgres-proof.log`.
- API clean verify runs 1300 tests with one pre-existing unrelated `CompanyPermissionArchitectureTest` failure covering 12 MFA/session/reset/signup routes. Those files are unchanged from HEAD; no unqualified API verify success claimed. Targeted feature suites pass 98 tests. Bruno requests documented, not run with live authenticated Development credentials.
- Excluding only the unchanged failing architecture test, remaining API verify passes: 231 Java suites /1297 tests, 40+8 OPA tests, SpotBugs and remaining phases. OPA uses an existing Docker image with read-only/no-network wrapper, not a new installed dependency. Exact command/environment in API work item 2.
- Production app build and Storybook build passed during integration; rerun app checks after final Combobox changes.
- API Repomix snapshot regenerated successfully with `npx --yes repomix@latest` after final API handoff.

## Final app checks

- `pnpm exec vitest run src --maxWorkers=2`: **73 test files /1186 tests passed**, including all new feature and shared component regressions.
- `pnpm lint`: **passed**, zero warnings.
- `pnpm build`: **passed**, TypeScript and Vite production artifacts.
- `pnpm exec storybook build`: **passed**.
- `node node_modules/@playwright/test/cli.js test --workers=2 --reporter=line`: **48 passed**, Chromium/Firefox/WebKit. Feature exercises login → overview → Branches → keyboard-open Dialog/search → pointer-select head → trimmed POST → row, focus return, refreshed overview count/activity, bearer and member filter contract, no page errors. Network requests are stubbed; this is not a live deployed API integration claim.
- Near-bottom mobile Combobox Storybook checks pass in **all three browsers**: 390×640 viewport, upward flip with4px gap, popup within viewport, search focus, keyboard selection/retained Token, Escape returns focus, no page errors. Chromium geometry: panel x17/y154/width356/height327; trigger y485/height42. Dialog E2E confirms portal is hittable above modal. Unit geometry covers offscreen triggers, bounds and width.
- Both repository snapshots regenerated with `npx --yes repomix@latest` after implementation. Generated TypeScript build metadata/config outputs cleaned back to initial state; existing user changes preserved.

## Human follow-ups / limitations

- Full API `./mvnw clean verify` is **not green** due to the unchanged architecture-test failure described above. No test exemptions were broadened.
- Spanish copy requires human language review, and supplied mock/screenshot pixel-fidelity review remains unperformed because image inspection is unavailable.
- Bruno requests are updated but not executed with live authenticated Development credentials.
- Moses retains decisions on excluded rate limiting and unbuilt ADR-0015. Member-name query log retention/redaction and read-audit follow-ups are documented in the API plan; broader pre-existing soft-delete gaps outside this feature are not changed.
