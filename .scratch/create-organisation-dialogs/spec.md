# Spec: Create department, job title and system role Dialogs

The canonical spec lives in the API repository at
`api/.scratch/create-organisation-dialogs/spec.md`.

## Open follow-ups

- Once this branch and the branch code and location work are both merged, refactor
  `CreateBranchDialog` to use the shared create pieces this work adds:
  - `CreateFormDialog`, `UnitNameField` and `HeadsField`
  - `useCreateFormSubmit`
  - `mapRefusal` and `createSchemas`

  It was left untouched here so the two branches don't conflict.
