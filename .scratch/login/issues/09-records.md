# 09: Records: app ADR, README, sign-off

**Repo:** app (`feature/login`), plus one API doc (`fix/onboarding-errors`). **Parent spec:** `.scratch/login/spec.md` (Records).

**What to build:** A reviewer or auditor can see who decided how Sessions work in the app, why, and what the app now does. Moses is asked to accept the Session decisions before the login work merges.

**Blocked by:** 02 (API fixes), 04, 05, 06, 07, 08

**Status:** resolved

- [x] **App ADR 0004, "Sessions go through the API's backend-for-frontend".**
  - Ported from `feature/signin`'s ADR 0005 and reworded to describe the in-browser Cognito approach it rejected, without citing ADR numbers that do not exist on `integration`.
  - It states that "Remember me" is removed and that every Session lasts seven days.
  - It adds today's decisions:
    - the email travels in history state, never in a URL
    - only an expired Session sends a person to Log in; an unreachable API does not
    - removed access re-settles the Current Company and keeps the Session
- [x] **API ADR-0029's citation** "app ADR 0003 and 0004" is reworded to point at app ADR 0004 and the in-browser approach explored on `feature/signin`.
- [x] **The README** stops saying that logging in is not connected. It describes Log in, the Session, Log out, Email confirmation, Challenges, password reset and Current Company, and the dev setup the Session needs: the proxy and allowed origins, plus the WebKit `__Secure-` cookie caveat on `http://localhost`.
- [x] **`CONTEXT.md`'s Access section** matches what shipped, with any wording drift found during 03–08 corrected.
- [x] **The PR description** asks Moses to accept ADR-0019, ADR-0029 and app ADR 0004 before merge. It lists the known gaps from the spec's Security Considerations.
- [x] `pnpm lint` passes.
