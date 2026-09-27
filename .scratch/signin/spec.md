# Spec: Sign-in and company sign-up

Status: ready-for-human

## Problem Statement

The app had no authentication. A working in-app Cognito flow existed only on the unmerged `origin/login` branch, built on older primitives (Button, Input, colour tokens) than `integration` now has. Against the API's `development` branch, a new company could not be registered: the form omitted the required owner name, Cognito's password refusals came back as 500s, rate-limit refusals had no CORS headers, and the frontend read the wrong error-code key.

## Solution

Port sign-in, sign-up (**Onboarding**), email confirmation, password reset and the new-password **Challenge** from `origin/login`, rebuilt on the current primitives. `/` becomes a **Guarded route**. Decisions are recorded in ADR 0003 (in-app Cognito) and ADR 0004 (tokens in localStorage). Terms are in `CONTEXT.md` under Access.

- New shared components, approved 2026-09-27: `forms/FormField`, `forms/PasswordInput`, `forms/Checkbox`, `ui/Link`, `ui/Toaster` (with `store/useToastStore`), `layout/AuthLayout`. `ui/Button` gained `loading`.
- Forms use React Hook Form and Zod, and mirror the API's CreateOnboardingRequest, SubdomainValidator and the pool's default password policy.
- The guard applies in development too; the `origin/login` DEV bypass was dropped.
- API companion branch `fix/onboarding-errors` (api repo, ADR-0028): Cognito refusals are 400s (`PASSWORD_POLICY_VIOLATION`, `IDENTITY_REJECTED`), public-path refusals carry CORS headers and preflights don't consume rate-limit tokens, and validation `errors[].field` is snake_case.

## Out of scope

Members, roles, invitations, the signed-in shell (`AuthenticatedLayout`), permissions, and API type generation.
