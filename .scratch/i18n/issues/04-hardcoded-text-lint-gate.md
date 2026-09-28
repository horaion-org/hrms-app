# 04: Lint gate against hardcoded user-facing text

**What to build:** Lint fails when user-facing text is written directly in code, and `CLAUDE.md` states the rule. This comes last because the rule fails until issues 02 and 03 have moved the existing strings. Parent spec: `.scratch/i18n/spec.md` (Enforcement).

**Blocked by:** 02 (Shared components translate their own text), 03 (Auth screens: translated copy and error reasons)

**Status:** ready-for-agent

- [ ] `eslint-plugin-i18next` is added, and `i18next/no-literal-string` runs as an error in JSX mode.
- [ ] The rule flags JSX text and user-facing attributes (`aria-label`, `alt`, `placeholder`, `title`, `label`, `hint`).
- [ ] The rule ignores non-text attributes (`className`, `type`, `id`, `name`, `autoComplete`, `pattern`, `to`, `variant`, `size` and similar).
- [ ] Test files, stories and `src/components/utils/development-tools/` are exempt.
- [ ] `pnpm lint` passes on the codebase with zero warnings.
- [ ] Checked once by hand without committing: a hardcoded `aria-label="Close"` or `<p>Hello</p>` in a component fails lint.
- [ ] `CLAUDE.md` gains a short rule: user-facing text goes in `src/assets/locales/en/translations.json` and is read with `useTranslation`, never written in code; shared components translate their own built-in text; API text is never displayed (see `docs/adr/0003-frontend-owns-user-facing-wording.md`).
