# 13: App: MFA Challenge and TOTP enrolment

**Repo:** app (`feature/signin`). **Parent spec:** `.scratch/bff-sessions/spec.md` (user stories 26–30; App → Pages, New components, New dependency).

**Blocked by:** 09

**Status:** resolved

- [ ] MFA Challenge screen in the sign-in flow using the shared `Input` (numeric, one-time-code).
- [ ] Add `qrcode`; `src/features/auth/TotpEnrollment/` (approved; four-file convention) shows QR, copyable secret, first-code entry.
- [ ] A guarded security-settings route to turn MFA on, and off/replace with password + code.
- [ ] Tests at the network seam; `pnpm lint`, `pnpm test:unit`, `pnpm build` pass.
