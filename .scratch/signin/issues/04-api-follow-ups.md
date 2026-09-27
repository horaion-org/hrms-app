# 04: API follow-ups seen during sign-up work

**What to build:** Three API gaps fell outside this change:

- A Company stays `PENDING_VERIFICATION` after the owner confirms their email. Nothing moves it to `ACTIVE`, and `IdentityProvider.isUserConfirmed` has no callers.
- There is no way to add a second person to a Company: no invite, `AdminCreateUser` or import endpoint on `development`. `origin/integration` has an old `MemberController` with them.
- The `origin/login` signed-in shell calls `GET /api/v1/companies/{id}/permissions`, which does not exist on `development`. Resolve this before porting that shell.

**Blocked by:** None

**Status:** needs-triage
