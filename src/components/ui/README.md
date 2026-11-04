# src/components/ui

Components relating to ui should be placed in this directory.

Example:

- ui/Button/
  - Button.tsx
  - Button.stories.tsx
  - Button.test.tsx
  - index.ts

## Stacking order

Floating parts are anchored with Headless UI's `anchor`, which renders them in
a portal at the end of `<body>`, so their `z-*` is compared page-wide rather
than inside the card or table that opened them. Each kind takes one layer, and
a part that can open inside another sits one layer higher:

| Layer  | Used by                                                                               |
| ------ | ------------------------------------------------------------------------------------- |
| `z-1`  | Pinned `DataTable` cells, inside the table's own scrolling frame                      |
| `z-10` | Menus: `OverflowMenu`, the `DataTable` sort menu                                      |
| `z-50` | `Dialog`, `Modal`, `Toast`                                                            |
| `z-60` | Anchored panels: `FiltersPopover`, `DatePicker`, `NotificationBell`, `FindingsMarker` |
| `z-70` | `Select` options, which can open inside a panel (a Filters field) or a `Dialog`       |

Sticky columns, sticky form headers and hover tips that stay inside their own
section (`LeaveTimeline`, `AccessRoleForm`, `z-20`/`z-30`) only order things
within that section. Pick the layer of the nearest analogue rather than a new
number; a new layer needs a reason that none of these covers.
