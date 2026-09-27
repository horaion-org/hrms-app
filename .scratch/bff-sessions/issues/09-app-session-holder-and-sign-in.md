# 09: App: Session holder, request helper, guarded routes, sign in / sign out

**Repo:** app (`feature/signin`). **Parent spec:** `.scratch/bff-sessions/spec.md` (App, Public API contract).

**Blocked by:** None — builds against the contract in the spec, not against a running API.

**Status:** resolved

- [ ] Remove `amazon-cognito-identity-js`, its module, web-storage token handling, "Remember me", the Node `global` shim.
- [ ] In-memory Session holder: access pass + expiry; single-flight renewal, cross-tab Web Lock, proactive renewal ~60 s before expiry; sign-out broadcast across tabs.
- [ ] Request helper: bearer on API calls, renew once and retry on 401, else sign out and redirect to sign-in with a return path; Session routes use credentials; sign-out clears the query cache.
- [ ] `_authenticated` renews when no access pass is held, else redirects to `/sign-in` with return path.
- [ ] Sign-in page and new-password page use the BFF routes; `EMAIL_NOT_VERIFIED` sends to email confirmation; new error codes mapped with English and Spanish text.
- [ ] Unit tests stub `fetch` and render real pages/routes; e2e mocks BFF routes with `page.route` (replace `seedSignedInSession`), asserts no token in web storage, reload stays signed in, sign-out propagates.
- [ ] `pnpm lint`, `pnpm test:unit`, `pnpm build` pass.
