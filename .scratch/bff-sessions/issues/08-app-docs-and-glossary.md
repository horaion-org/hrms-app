# 08: App: ADR 0005 and glossary

**Repo:** app (`feature/signin`). **Parent spec:** `.scratch/bff-sessions/spec.md` (Supersessions and records).

**Blocked by:** None. Can start immediately.

**Status:** resolved

- [ ] `docs/adr/0005-sessions-through-the-api-bff.md` in this repo's ADR style; 0003 and 0004 marked superseded by 0005.
- [ ] `CONTEXT.md`: rewrite **Session** (server-held, seven days, app holds only a short-lived access pass, sign-out ends it on this device; _Avoid_: Login, auth state, tokens); add **Current Company**; keep Sign in / Sign out wording.
