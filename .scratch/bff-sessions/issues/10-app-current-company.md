# 10: App: Current Company and Company picker

**Repo:** app (`feature/signin`). **Parent spec:** `.scratch/bff-sessions/spec.md` (App → Current Company; user stories 33–36).

**Blocked by:** 09

**Status:** resolved

- [ ] After renewal, guarded routes load the current user and settle the Current Company: last-chosen id from `localStorage` if among active Memberships; else the only Company; else the Company picker; no active Company → clear message.
- [ ] `src/features/auth/CompanyPicker/` (approved) with the four-file convention.
- [ ] Tests at the network seam; `pnpm lint`, `pnpm test:unit` pass.
