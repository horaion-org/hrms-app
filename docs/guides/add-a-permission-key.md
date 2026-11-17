# Add a permission key

The API owns the permission catalogue; the app takes a byte copy of its contract and generates its key list from it.
Never write a key by hand anywhere else. Below, `<resource>:<action>` is the new key (`report:export`).

## Steps

1. **Copy the contract.** Replace `contracts/permission-catalog.json` with the API's
   `hrms-backend-v2/contracts/permission-catalog.json`, byte for byte. Do not edit it here.

2. **Generate the key list.**

   ```sh
   pnpm generate:permissions
   ```

   It validates the contract and rewrites `src/features/workspace/permissionContract.generated.ts`. Never edit that
   file by hand; `pnpm check:contract` (part of `pnpm lint`) fails when it is stale.

3. **Give the key words** in `src/assets/locales/en/translations.json` and `src/assets/locales/es/translations.json`
   ([Add copy](add-copy.md)):
   - `organisation.permissions.<resource>.actions.<action>`: the label, such as "Export reports";
   - `organisation.permissions.<resource>.actionHints.<action>`: what it lets its holder do, in more words.

   Until both exist in English, `tsc` fails wherever the labels are read through `labelKeyOf` and `hintKeyOf`
   (`src/features/organisation/PermissionChecklist/groups.ts`, `PermissionChecklist.tsx`, `AccessRoleForm.tsx`).
   - A new resource also needs `organisation.permissions.<resource>.name` and `.description`.
   - A new `worksWith` reason in the contract needs `organisation.permissions.uses.<reason>.why` and `.without`.
   - A new module needs `organisation.permissions.sections.<module>.name`.

4. **A new resource only: put it in a role editor area.** Add it to the area whose screens it opens in
   `PERMISSION_AREAS`, `src/features/organisation/permissionAreas.ts`. `src/features/organisation/permissionAreas.test.ts`
   fails while a resource sits in no area.

5. **Gate what the key opens.** Use `<Can permission="<resource>:<action>" at={…}>` from
   `src/features/workspace/Can` around what it shows, or `useAccess().can("<resource>:<action>", scope)` in a hook.
   `at` is always explicit: a `ScopeRef` such as `COMPANY_SCOPE`, `departmentScope(id)`, or `"anywhere"` for a menu
   entry. Hiding a control is presentation only: the API decides on every request. A list of keys several screens
   share goes in `src/features/workspace/permissionKeys.ts` as a `*_KEYS` constant.

6. **Update the tests that pin the catalogue.** Some tests in `src/features/organisation` list keys by area or by
   day, and fail with the new key named: `permissionAreas.test.ts` (an area's keys), `areaLevels.test.ts` (whether an
   area offers more than seeing) and `newPermissions.test.ts` (keys new since a role was saved). Each failure is a
   real change in what the role editor shows: check it is the one the API meant, then add the key to the expected
   list.

7. **Prove it.**

   ```sh
   pnpm check:contract
   pnpm exec vitest run --maxWorkers=3 src/features/workspace/permissionKeys.test.ts src/features/organisation src/common/locales.test.ts
   pnpm exec tsc --noEmit
   ```
