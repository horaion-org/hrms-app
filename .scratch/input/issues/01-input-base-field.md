# 01: Input: base field with neutral, focus and disabled looks

**What to build:** A developer can import the shared Input form control and use it in place of a raw `<input>`, including spreading React Hook Form's `register()` straight onto it. It renders the designed box: a 44px bordered field with the Neutral look at rest, lighter placeholder text, an Ink Blue border while focused, and a Neutral disabled look. Parent spec: `.scratch/input/spec.md`.

This ticket creates the component's full file set (component, constants, story, test, index re-export) in the shared forms components. It follows the Button component's conventions: named export, `FunctionComponent` return type, imports through the `@/` alias. The constants module can start empty or hold only what this ticket needs; ticket 03 adds the status list.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Input renders a textbox, and typing updates its value.
- [x] Every native input prop (e.g. `type`, `name`, `placeholder`, `value`/`defaultValue`, `onChange`, `onBlur`) is passed to the native input.
- [x] `ref` reaches the native input element, so `register()` works unchanged.
- [x] `className` goes on the bordered wrapper, not on the native input.
- [x] The wrapper draws the box: 44px tall, 16px horizontal padding, 12px gap, 8px radius, 1px Neutral 400 border, white background, small text. The native input has no border, outline or background of its own and fills the remaining width.
- [x] Entered text is Neutral 900, and placeholder text is Neutral 500.
- [x] While the field has focus (mouse or keyboard), the border is Ink Blue 900.
- [x] Disabled: Neutral 200 background, Neutral 400 border, Neutral 500 text, not-allowed cursor. It can't be typed into and is skipped when tabbing.
- [x] Storybook has stories for the filled, placeholder and disabled states.
- [x] Unit tests (Testing Library, modelled on Button's) cover typing, native props, `ref`, `className` placement and disabled.
- [x] `pnpm lint` and `pnpm test:unit` pass.

## Comments

### 2026-09-26 — Integration completed

- Coordinator reviewed the implementation; agent verification passed 349 tests and lint (reported handoff evidence).
- Read all five files from `/tmp/opencode/horaion-input-01/src/components/forms/Input` and added identical files to `src/components/forms/Input` using `apply_patch`.
- Identity verification: `diff -rq /tmp/opencode/horaion-input-01/src/components/forms/Input /home/vernon/projects/horaion/app/src/components/forms/Input` exited 0 with no differences.
- Main repository targeted integration verification: `pnpm exec vitest run src/components/forms/Input/Input.test.tsx` passed 1 test file and all 8 tests (1.15s).
- Main repository `pnpm lint` passed with zero warnings.
- All acceptance criteria checked based on the coordinator-reviewed implementation and verification evidence above. No files staged or committed.
