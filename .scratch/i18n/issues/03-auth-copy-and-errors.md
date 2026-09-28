# 03: Auth screens: translated copy and error reasons

**What to build:** The log-in, register and password recovery screens take all their copy from `auth.*` keys, and registration errors are mapped from API codes to translated messages instead of English text in `api.ts`. Parent spec: `.scratch/i18n/spec.md` (API text, Wording).

**Blocked by:** 01 (i18n foundation)

**Status:** ready-for-agent

- [ ] All AuthForm copy comes from `auth.login.*` and `auth.register.*` keys. That covers headings, subtitles, the hidden legend, field labels, placeholders, hints, the show and hide password names, "Remember me", link text, button text including the pending state, and the success screen.
- [ ] PasswordRecovery's heading, notice and link come from `auth.passwordRecovery.*` keys.
- [ ] Wording follows `CONTEXT.md`: **Company** and **Workspace address**, and "workspace" never appears on its own. The success message reads "Your company has been created. Please verify your email before signing in to Horaion."
- [ ] `registerCompany` throws a typed registration error whose reason is one of `emailTaken`, `workspaceAddressTaken`, `rateLimited`, `invalid`, `conflict`, `unreachable` or `unknown`, decided from the body's `errorCode` (`EMAIL_ALREADY_REGISTERED`, `IDENTITY_ALREADY_EXISTS`, `SUBDOMAIN_ALREADY_TAKEN`, `RATE_LIMITED`) and then from the HTTP status. A missing or non-JSON body is tolerated. `api.ts` contains no user-facing text.
- [ ] AuthForm shows the `auth.errors.*` message for each reason, and the sign-in-unavailable message comes from a key.
- [ ] Unit tests: `registerCompany` returns the right reason for each code and status, and for network failure and timeout, using a mocked `fetch`. AuthForm renders the message for each reason.
- [ ] `e2e/auth.spec.ts` is updated for the new copy. The link it clicks is named "Signup" in the spec but "Sign up" in the UI, so fix the spec to match.
- [ ] `pnpm lint`, `pnpm test:unit` and `pnpm test:e2e` pass.
