# 10: Retire feature/signin

**Repo:** app. **Parent spec:** `.scratch/login/spec.md` (Starting point).

**What to build:** Once the login work has merged, there is only one auth implementation. The superseded `feature/signin` branch and its worktree are removed.

**Blocked by:** 09 (Records), and `feature/login` merged into `integration`

**Status:** ready-for-human

- [ ] Before deleting anything:
  - Confirm that nothing on `feature/signin` is still needed.
  - The MFA settings page, the TOTP enrolment panel and the Toaster were deliberately left out. Note their commit so the deferred MFA settings work can find them.
- [ ] With the owner's go-ahead:
  - Remove the `../worktree/signin` worktree.
  - Delete the local `feature/signin` branch.
  - Delete the remote `feature/signin` branch, if one exists.
