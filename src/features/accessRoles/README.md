# Access roles

Settings › Access roles (`/settings/access-roles`): the company's access roles, what each allows, and who
holds each one where. A role is a named set of permission keys. It is given to a person at the whole
company, a Branch or a Department. Everything comes from the API (`features/accessRoles/api.ts`), and the
API decides every change. The pages are shells: `pages/AccessRoles.tsx`, `pages/AccessRoleEditor.tsx` and
`pages/AccessRoleCreate.tsx` read the route and render the screens below. The old
`/organisation/system-roles` addresses redirect here.

## Shape

- `api.ts`: the role schema and kinds (`COMPANY` or `LOCAL`), the paged list, one role, create, update and
  delete; who holds a role (`fetchAccessRoleHolders`), one person's assignments, and grant, switch on/off
  and revoke. `listPath` and `unitStatusSchema` are reused from `features/organisation/api.ts`.
- Screens: `AccessRoleList` (the list, its toolbar and each row's actions), `AccessRoleEditor` (one role:
  the People tab, then the Permissions tab, with `tab` and `onTabChange` from the page;
  `AccessRoleEditorProblem` when the role can't be loaded) and `NewAccessRole` (the create page).
- Holders: `AccessRoleHolders` (what the role allows, who has it and where, and the remove and switch
  confirmations) and `AssignAccessRole` (the assign dialog wired to the colleagues search, the workspace's
  places and `useAccessRoleHolders`' changes). `AccessRoleAssignments` is the people table, and
  `AssignAccessRoleDialog` is the dialog itself, with a preview of the person's access after the change.
- Row actions: `AccessRoleActionDialog` (deactivate or activate after showing who it affects, delete a role
  nobody holds, duplicate into `CreateAccessRoleDialog`). `AccessRoleStatusDialog` is the status
  confirmation.
- Forms: `AccessRoleForm` (name, kind and permissions, for the create and edit pages) and
  `CreateAccessRoleDialog` (the list's create dialog, starting from a `roleTemplates` template or from
  scratch). `PermissionChecklist` lists the keys by section, and `PermissionSummary` shows a role's keys
  read-only, section by section (`sectionLevels.ts`).
- Rules, as pure modules with tests: `assignmentTargets.ts` (the places a role can be given at, whether it
  fits, `changeableAt`), `accessSummary.ts` (what a person's roles give at each place), `memberRoles.ts` (a
  person's roles by place, in words, and the change their profile form makes), `accessRoleReadOnly.ts` (why
  a role can only be viewed), `accessRoleFormSchema.ts`, and the refusal modules `accessRoleRefusal.ts` and
  `assignmentRefusal.ts`. The place helpers (`placeKey`, `placeOf`, `scopeOfPlace`) are workspace's
  (`features/workspace/places.ts`).
- Hooks: `useAccessRoles` (the list, on organisation's `useOrganisationList`), `useAccessRoleRowChanges`
  (status and delete, on organisation's `useRowChange`), `useAccessRoleHolders` (read and change who holds
  a role), `useMemberRoles` (one person's roles), `useCreateAccessRole` (the create page and the list's
  dialog) and `useUpdateAccessRole`.

Copy keeps the `organisation.accessRoles.*` i18n namespace. Imports go one way: accessRoles uses
organisation's list machinery and workspace. People reads and changes a member's roles through
`useMemberRoles`, `memberRoles.ts` and `useAccessRoleHolders`. Neither imports accessRoles back
(`pnpm lint` runs `check:feature-cycles`).

## Permissions

Role definitions are company-wide. Creating needs `access_role:create` at the company, and the create
page sends anyone without it to Forbidden. Editing needs `access_role:update`, and deleting needs
`access_role:delete`. The Company Owner role is never edited, assigned or deleted here. A role holding a
key the person doesn't hold is shown read-only, because the API refuses any change to it. Assigning,
removing and switching an assignment need `access_role:assign` at that assignment's own place. A role
can only hold keys the person holds company-wide (the API's subset rule). The API checks every request
regardless.

## Verification

```sh
pnpm lint
pnpm exec vitest run src/features/accessRoles src/features/organisation src/features/people src/features/workspace
pnpm build
```
