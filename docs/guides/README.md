# Guides

Step-by-step recipes for the changes this app sees most. Each one names the exact files to touch, the nearest existing
example to copy, and ends with the command that proves the guide was followed. They are written for a reader with no
context, a person or Claude: follow the steps in order, and when a step does not fit the code, stop and find out why
rather than work around it.

| Guide | Use it to |
| --- | --- |
| [Add a constraint type](add-a-constraint-type.md) | Show a constraint type the API has added |
| [Add a page](add-a-page.md) | Add a signed-in page with its route, menu entry and test |
| [Add an API read or write](add-an-api-read-or-write.md) | Read or change something through the API, with its refusals |
| [Add a roster finding](add-a-roster-finding.md) | List a new kind of fact in the roster's Issues panel |
| [Add a permission key](add-a-permission-key.md) | Take a key the API's permission contract has added |
| [Add a shared component](add-a-shared-component.md) | Put a new component in `src/components` |
| [Add copy](add-copy.md) | Add words a person reads, in English and Spanish |

## The structure every guide keeps

Imports point one way: `routes → pages → features → components → common`. `src/common` imports nothing above it, a
shared component never imports a feature, and a feature never imports a page or a route. Code outside a component
folder imports it through its `index.ts`. `src/features/README.md` says more.

`pnpm lint` checks this before eslint runs. Each check fails with the file, the rule and what to do:

| Script | What it keeps |
| --- | --- |
| `scripts/check-feature-cycles.mjs` | No two features, and no two areas of `features/scheduling`, import each other |
| `scripts/check-import-direction.mjs` | Imports point down the layers, and into a component folder only through its `index.ts` |
| `scripts/check-file-size.mjs` | Source files stay within 500 lines, test files within 1,500 |
| `scripts/check-loose-codes.mjs` | API refusal codes are named only in a feature's refusal module |
| `scripts/check-story-translations.mjs` | A story of a translated component loads the translations |

Each check holds a list of today's exceptions. The lists only shrink: when a check prints "delete it from …", delete
that line; never add one. The checks' own tests run with `pnpm exec vitest run scripts`.
