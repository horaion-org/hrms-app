# 02: Shared components translate their own text

**What to build:** Stepper, Sidebar and AuthLayout take their built-in text from translation keys, and Stepper accepts an override for its navigation name. Parent spec: `.scratch/i18n/spec.md` (Shared components translate their own text).

**Blocked by:** 01 (i18n foundation)

**Status:** ready-for-agent

- [ ] Stepper's navigation name comes from `stepper.label` ("Steps"), and an optional `aria-label` prop replaces it.
- [ ] Each StepperStep's accessible name comes from an interpolated key, "Step {{number}}: {{label}}", with a completed variant that adds ", completed". What people hear doesn't change in English.
- [ ] Sidebar's home link name ("Horaion home") and navigation name ("Main navigation") come from `sidebar.*` keys.
- [ ] AuthLayout's headline, subtitle, slide alt text ("Active Workforce") and "Go to slide {{number}}" button names come from `authLayout.*` keys.
- [ ] Stories and tests cover Stepper with its default name and with an overridden one. Existing Stepper, Sidebar and AuthLayout tests still pass, querying by the same English.
- [ ] `pnpm lint` and `pnpm test:unit` pass.
