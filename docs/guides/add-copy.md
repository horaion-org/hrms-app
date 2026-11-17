# Add copy

Every word a person reads comes from the two locale files, never from a string in a component:
`src/assets/locales/en/translations.json` and `src/assets/locales/es/translations.json`. English is the reference:
its keys type every `t("…")` call (`src/i18next.d.ts`).

## Steps

1. **Find the section.** Copy lives under the feature or page that shows it (`scheduling.constraints.dialog`,
   `shell.navigation`). Add a key to the section that owns it; a new section only for a new feature or page.

2. **Write the English** in sentence case: capitalise the first word and proper names only, never with CSS
   (`CONTEXT.md`, "Interface copy"). A message about something that went wrong says what happened, then what to do.
   Plurals use i18next's suffixes (`count_one`, `count_other`); values go in as `{{name}}`.

3. **Write the Spanish** under the same key, in the same place in `src/assets/locales/es/translations.json`.

4. **Use the key as written.** `t("section.key")`, or a template whose parts are typed unions, as
   `issueTopic` in `src/features/scheduling/roster/rosterIssueGroups.ts` builds `scheduling.issues.topics.${topic}`
   from `IssueTopic`. Never cast a key with `as`: the cast hides a missing key from `tsc`. (The two label helpers in
   `src/features/organisation/PermissionChecklist/groups.ts`, `labelKeyOf` and `hintKeyOf`, cast to a type built
   from the permission keys, which keeps the check: a missing label still fails `tsc` where it is read.)

5. **Prove it.**

   ```sh
   pnpm exec vitest run --maxWorkers=3 src/common/locales.test.ts
   pnpm exec tsc --noEmit
   ```

   `src/common/locales.test.ts` fails with every key one file has and the other lacks. `tsc` fails on a `t("…")` key
   missing from English. Nothing checks the casing or a cast: read your diff for both.
