# 01: i18n foundation: bundled English, shared setup, document language and dates

**What to build:** English is bundled, it is the only supported language, and it's ready on the first render. Tests and Storybook render with the real English file. The page's language, title and description follow i18next, and Calendar's combined date patterns come from translations. Parent spec: `.scratch/i18n/spec.md` (Languages, Loading, Document language, Dates, Shared i18n setup).

**Blocked by:** none

**Status:** ready-for-agent

- [ ] i18next is initialised with the English file as bundled `resources`, with `supportedLngs: ["en"]` and `fallbackLng: "en"`. Browser detection stays, and a browser that prefers another language resolves to `en`.
- [ ] `i18next-http-backend` is removed, along with the locales copy target in `vite.config.ts` (and `vite-plugin-static-copy` if nothing else uses it). The Suspense fallback in `main.tsx` has no text.
- [ ] `src/assets/locales/es/` is removed, along with the `dayjs/locale/es` import and the Spanish test cases in Calendar and Select.
- [ ] `<html lang>`, `document.title` and the meta description are set from the resolved language and `document.*` keys at start-up and on `languageChanged`. `index.html` keeps its English defaults.
- [ ] A single registry maps a language to its dayjs locale and replaces `localeFor` in `Calendar.dates.ts`. An unknown language maps to English.
- [ ] The month title pattern and the full day label pattern come from `calendar.format.*` keys. English output is unchanged ("June 2026", "Wednesday, 10 June 2026").
- [ ] One shared helper creates an i18next instance with the English resources. `vitest.setup.ts` uses it for every test, and `.storybook/preview.ts` wraps stories with it. Calendar and Select tests use it instead of their private instances, and their stories now show real copy, not raw keys.
- [ ] Tests: a browser preferring an unsupported language gets English; `<html lang>`, the title and the description are set; the dayjs registry falls back to English; the Calendar labels are unchanged.
- [ ] `pnpm lint`, `pnpm test:unit` and `pnpm build` pass.
