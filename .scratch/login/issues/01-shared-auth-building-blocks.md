# 01: Shared auth building blocks

**Repo:** app (`feature/login`). **Parent spec:** `.scratch/login/spec.md` (Components, Onboarding changes).

**What to build:** This is a prefactor so that every later auth screen can use the same password input and form-level message. Onboarding adopts both and looks and behaves exactly as it does today.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The password input with a show and hide toggle is ported from `feature/signin` into the shared form components, in the four-file convention. It keeps an accessible name for the toggle and `aria-pressed`.
- [x] A new form-level message component in the auth feature, in the four-file convention. It has an error kind (`role="alert"`) and a status kind (`role="status"`), and is styled like Onboarding's current error box.
- [x] Onboarding's two inline password toggles (password and Confirm password) use the password input.
- [x] Onboarding's inline error box is replaced by the message component.
- [x] Onboarding's behaviour is unchanged: validation, focus on the first rejected field, the disabled fieldset while sending, and the success message. The existing unit and end-to-end tests pass unmodified, apart from selectors that must follow the new markup.
- [x] Each new component has stories and Testing Library tests covering its accessible roles and names.
- [x] `pnpm lint`, `pnpm test:unit`, `pnpm test:e2e` and `pnpm build` pass.
