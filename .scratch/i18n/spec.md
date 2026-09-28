# Spec: Translatable copy

Status: ready-for-agent

## Problem Statement

Horaion is English only today, but it may add other languages later. Most of the text people read is written directly in code: the whole log-in and register flow, the password recovery page, the brand panel beside those forms, the registration error messages, and the built-in labels of Stepper and Sidebar. Only Calendar and Select use translation files. Adding a language would mean hunting for strings across the codebase, and nothing stops new ones from being written the same way.

The current setup also has loose ends. Spanish covers only the 19 Calendar and Select keys. Translations are fetched over HTTP on every cold start behind a Suspense fallback that shows the English word "loading". Storybook has no i18n setup, so Calendar and Select stories show raw keys.

## Solution

Every word a person reads, including visible copy, placeholders, accessible names, alt text, the page title and error messages, comes from a translation file. English is the only language for now and ships inside the bundle. Adding a language later means adding its translation file and its dayjs locale, and nothing else in the UI changes. A lint rule fails on new hardcoded text.

The app never shows text the API sends. It maps the API's stable codes and HTTP statuses to its own wording (`docs/adr/0003-frontend-owns-user-facing-wording.md`).

## User Stories

1. As a person using Horaion, I want every label, message and heading in one language, so that the interface never mixes languages.
2. As a screen-reader user, I want accessible names, alt text and hidden legends in the same language as the page, and the page's `lang` to match it, so that my screen reader pronounces them correctly.
3. As a person registering a Company, I want a specific message when my email is already registered, my Workspace address is taken, or I've tried too many times, so that I know what to fix.
4. As a person whose browser prefers another language, I want Horaion shown fully in English until my language is supported, so that I never see a half-translated page.
5. As a person opening Horaion, I want the first screen to appear without a "loading" word flashing first, so that start-up feels immediate.
6. As a developer, I want shared components to translate their own built-in text, so that I can't forget an accessible name.
7. As a developer, I want to override a shared component's built-in label where the context needs a more specific one, such as a Stepper named "Onboarding steps".
8. As a developer, I want a misspelt translation key to fail type-checking, so that broken copy never ships.
9. As a developer, I want lint to fail when I write user-facing text directly in code, so that hardcoded text can't creep back.
10. As a developer, I want unit tests and Storybook to render the real English copy, so that tests read like the UI and stories look like the product.
11. As a maintainer adding a language, I want to add one translation file and one dayjs locale and have every string, date format and the page language follow, so that adding a language is a translation task, not a code hunt.
12. As a maintainer, I want the decision to ignore the API's English text recorded, so that nobody "fixes" the app to show it.

## Implementation Decisions

- **What must be translated.** All user-facing text: JSX text, placeholders, `aria-label`, `alt`, hidden legends, the document title and meta description, and every error message a person can see. Developer-only text stays in code: thrown invariants (such as `StepperStep must be rendered inside Stepper`), devtools, console output, and test and story fixtures. The brand name "Horaion" is written literally inside translated sentences.
- **Languages.** English (`en`) only. Remove the `es` translation file, the `dayjs/locale/es` import and the Spanish test cases. Configure i18next with `supportedLngs: ["en"]` and `fallbackLng: "en"`. Browser language detection stays, but it can only resolve to a supported language. There's no language switcher and no saved per-person or per-company preference yet.
- **Loading.** Import the English file and pass it to i18next as bundled `resources`, initialised so the first render already has copy. Remove `i18next-http-backend`, the locales copy target in `vite.config.ts` (and `vite-plugin-static-copy` if nothing else uses it), and the English Suspense fallback text in `main.tsx`. Lazy loading comes back when a second language arrives.
- **Key organisation.** Keep the single `translations` namespace, with one top-level group per owning component or feature: `calendar`, `select`, `stepper`, `sidebar`, `authLayout`, `auth` (with `login`, `register`, `passwordRecovery` and `errors` inside), and `document` for the title and description. Use `common` only for words that really are shared. Keys are camelCase, and existing keys keep their names. Plurals use i18next's `_one`/`_other` suffixes, and the types keep coming from the existing `CustomTypeOptions`.
- **Shared components translate their own text** with `useTranslation`, as Calendar and Select already do:
  - **Stepper:** the navigation name defaults to `stepper.label` ("Steps"), and an optional `aria-label` prop replaces it. Each step's accessible name comes from an interpolated key: "Step {{number}}: {{label}}", plus ", completed" for completed steps.
  - **Sidebar:** the "Horaion home" link name and the "Main navigation" landmark name come from `sidebar.*`. There's only one Sidebar, so it has no override prop.
  - **AuthLayout:** the headline, the subtitle, the slide image's alt text and the "Go to slide {{number}}" button names come from `authLayout.*`.
  - Components that already take all their text as props (Button, Checkbox, Tabs, OverflowMenu, SidebarItem, Input, Badge) don't change. Their callers pass translated strings.
- **Document language.** `<html lang>`, `document.title` and the meta description follow the resolved language at start-up and whenever the language changes. `index.html` keeps English defaults for the first paint and for crawlers.
- **Dates.** Calendar already reads `resolvedLanguage`. One small registry maps a language to its dayjs locale and replaces the Spanish-only `localeFor` in `Calendar.dates.ts`. Patterns that combine parts, meaning the month title (`MMMM YYYY`) and the full day label (`dddd, D MMMM YYYY`), move into translation keys so each language sets its own order. English keeps today's output ("Wednesday, 10 June 2026"). Single-part patterns (`MMMM`, `ddd`, `D`, `YYYY`) stay in code. The week starts on Monday in every language (see **Weekend** in `CONTEXT.md`). ADR 0002 still holds: dayjs provides localised names.
- **API text (ADR 0003).** `registerCompany` stops throwing English messages. It throws a typed registration error with a reason:
  - `emailTaken` for `errorCode` `EMAIL_ALREADY_REGISTERED` or `IDENTITY_ALREADY_EXISTS`.
  - `workspaceAddressTaken` for `SUBDOMAIN_ALREADY_TAKEN`.
  - `rateLimited` for `RATE_LIMITED` or status 429.
  - `invalid` for any other 400.
  - `conflict` for a 409 with no known code.
  - `unreachable` for a network failure or timeout.
  - `unknown` for everything else.

  The code is read from the ProblemDetail body's `errorCode` property, and a missing or non-JSON body is tolerated. The API's JSON is camelCase throughout (API ADR-0028). AuthForm maps each reason to an `auth.errors.*` key. The sign-in-unavailable message becomes a key as well.
- **Wording.** Copy follows the terms in `CONTEXT.md`: **Company** for the business and **Workspace address** for its web address. "Workspace" is never used on its own. The register success message becomes "Your company has been created. Please verify your email before signing in to Horaion."
- **Shared i18n setup for tests and Storybook.** One helper creates an i18next instance with the real English resources. `vitest.setup.ts` uses it for every test, and `.storybook/preview.ts` wraps each story in an `I18nextProvider` with it. The Calendar and Select tests drop their private instances.
- **Enforcement.** Add `eslint-plugin-i18next`'s `no-literal-string` rule as an error in JSX mode:
  - It flags JSX text and user-facing attributes (`aria-label`, `alt`, `placeholder`, `title`, `label`, `hint`).
  - It ignores non-text attributes (`className`, `type`, `id`, `name`, `autoComplete`, `pattern`, `to`, `variant`, `size` and similar).
  - Test files, stories and the development tools are exempt.
  - Add a short rule to `CLAUDE.md`: put user-facing text in `src/assets/locales/en/translations.json` and never in code, and never display API text (ADR 0003).

## Testing Decisions

- Tests keep querying by the English a person sees, rendered from the real English file. A missing key renders as the raw key, so the query fails.
- **Behaviours to cover:**
  - Each registration error reason, from API code or status to the message shown. Unit-test `registerCompany` with a mocked `fetch`, and test AuthForm rendering the message for each reason.
  - Stepper's default accessible name and an overridden one, and the step names with and without "completed".
  - Sidebar's link and navigation names.
  - AuthLayout's alt text and slide button names.
  - After start-up, `<html lang>` is `en` and the title and description come from translations.
  - A browser that prefers an unsupported language gets English.
  - Calendar's full day label still reads "Wednesday, 10 June 2026" and the month title still reads "June 2026".
- **e2e:** update `e2e/auth.spec.ts` for the new copy, including the register success message. The spec clicks a link named "Signup", but the form's link says "Sign up".
- **Lint gate:** `pnpm lint` passes with the rule on and fails on a planted hardcoded string. Check that once by hand; don't commit it.

## Out of Scope

- A second language, a language switcher, and a saved language preference per person or per Company.
- The verification and password-reset emails Cognito sends. They're configured in the AWS console, outside both repos.
- API changes. Errors that lack a code are tracked in `api/.scratch/error-codes/issues/`.
- Right-to-left layout.
- Pseudo-localisation.

## Further Notes

- These decisions came from a grilling session on 2026-09-27. They're recorded in `docs/adr/0003-frontend-owns-user-facing-wording.md` and in the new `CONTEXT.md` entries for **Company** and **Workspace address**.
- The auth screens this rewrites are still uncommitted on `integration`. Land them first or together with this work.
- The registration body's key casing no longer needs attention. The API switched its JSON contract to camelCase (API ADR-0028), and `src/features/auth/api.ts` sends the `Registration` object unchanged.
