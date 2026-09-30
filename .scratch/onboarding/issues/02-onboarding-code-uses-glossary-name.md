# 02: Onboarding code uses the glossary's name

**Repo:** app. **Origin:** found while specifying `.scratch/login/spec.md` (Out of Scope).

**What to build:** The code that creates a Company is named for Onboarding, as the glossary and the API call it, so that "registration" is left to the Company's Registration number.

**Blocked by:** `.scratch/i18n/issues/03-auth-copy-and-errors.md`, which rewrites the same module and already renames the "Workspace name" label to Workspace address.

**Status:** ready-for-agent

- [ ] The Onboarding API call and its error type are named for Onboarding rather than registration or register.
- [ ] Nothing else renames: the `/register` route and the "Sign up" copy stay.
- [ ] If i18n issue 03 did not change the form's "Workspace name" label, it now reads "Workspace address".
- [ ] `pnpm lint`, `pnpm test:unit` and `pnpm build` pass.
