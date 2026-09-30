# 08: Current Company

**Repo:** app (`feature/login`). **Parent spec:** `.scratch/login/spec.md` (Current Company, Guarded routes, Placeholder home, Components).

**What to build:** After logging in, a person lands in the Company they used last, or their only Company, or chooses one when they belong to several. The home page shows the Current Company and lets them switch. If their access to the Current Company is removed mid-Session, they are moved to a Company they can still use, or asked to choose, without logging in again. If they have no Company left, they see a clear message and can log out.

**Blocked by:** 03 (Log in, home, Log out)

**Status:** resolved

- [x] **Settling.** Current Company settling is ported from `feature/signin`. A Company is usable when both its membership and the company are active in `/me`. The Current Company is the last chosen one while it is usable, otherwise the only usable one, otherwise the person's choice.
- [x] **Remembering the choice.** The last chosen Company id is kept in `localStorage`, and is ignored when that Company is not usable. Reads and writes tolerate storage being unavailable.
- [x] **The Company picker** is ported into the auth feature in the four-file convention (approved 2026-09-27). It is rebuilt in Onboarding's design, and choosing a Company remembers it.
- [x] **The home page** shows the Current Company's name. It offers "Switch company", which opens the picker, when more than one Company is usable.
- [x] **`MEMBERSHIP_REVOKED` from any request:**
  - Drop the cached `/me`, reload it, and settle again.
  - The Session is kept, and no password is asked for.
- [x] **When `/me` itself is refused** with 403 (`MEMBERSHIP_REVOKED` or `AUTHORIZATION_DENIED`), a "You no longer have access to any company" screen offers Log out. The Session is not ended automatically.
- [x] **Copy** comes from `auth.*` keys and says "Company", never "workspace", "tenant" or "org".
- [x] **Unit tests at the network seam:**
  - each settling rule, including a remembered Company that is no longer usable
  - switching
  - re-settling on `MEMBERSHIP_REVOKED`, to another Company and to the picker
  - the no-access screen
  - the picker's stories and Testing Library tests
- [x] **End to end** (mocked `/me` with two Companies): log in, land in the one used last, switch, and reload into the switched Company.
- [x] `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e` and `pnpm build` pass.
