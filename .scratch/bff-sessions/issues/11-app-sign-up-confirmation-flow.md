# 11: App: sign-up → email confirmation → sign-in

**Repo:** app (`feature/signin`). **Parent spec:** `.scratch/bff-sessions/spec.md` (user stories 1–8, 11).

**Blocked by:** 09

**Status:** resolved

- [ ] Sign-up success goes to email confirmation; confirmation and resend use the BFF routes; success lands on `/sign-in` with the email prefilled.
- [ ] Error codes mapped (en, es); tests at the network seam; e2e covers sign-up → confirm → sign-in.
- [ ] `pnpm lint`, `pnpm test:unit` pass.
