# 01: Button: icon-only `icon` variant

**What to build:** Button gains an `icon` variant: a square, transparent button that holds only an icon, for the Calendar header arrows and future icon-only actions. Its type requires an accessible name. Parent spec: `.scratch/calendar/spec.md` (Implementation Decisions → Button change).

**Blocked by:** None. Can start immediately.

**Status:** resolved

- [x] `variant="icon"` renders a square, transparent button. The icon is Neutral, turns Ink Blue on hover and pressed, and is muted Neutral when disabled. It keeps Button's shared focus ring.
- [x] The icon is passed as `children`. `size` and the leading/trailing icon props don't apply to this variant.
- [x] With `variant="icon"`, the props type requires either `aria-label` or `aria-labelledby`. Leaving both out fails type-checking (checked with `expectTypeOf` or `@ts-expect-error`).
- [x] The existing variants are unchanged, and their tests still pass untouched.
- [x] Storybook has an Icon story (for example with `ChevronLeftIcon`), including a disabled case, and a `variant` control that offers `icon`.
- [x] Button's existing test covers `variant="icon"`: it renders by role and accessible name, clicks call `onClick`, disabled blocks clicks, and `className` is passed through.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

- Implemented in isolated worktree, reviewed against ticket/spec and repository standards, and integrated unstaged. Full lint passed; 455 unit tests passed. Coordinator rechecked 11 Button tests and TypeScript after byte-identical integration. No commits created. Designer confirmation of icon hover remains pending as planned.
