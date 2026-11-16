import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ChosenConstraintType } from "@/features/scheduling/constraints/ChosenConstraintType";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/Constraints/ChosenConstraintType",
	component: ChosenConstraintType,
	parameters: { layout: "padded" },
	args: { type: "SHIFT_STAFFING", onChange: fn() },
} satisfies Meta<typeof ChosenConstraintType>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Chosen in step 1; Change goes back to the chooser. */
export const Changeable: Story = {};

/** A company constraint's kind, which can't change. */
export const Fixed: Story = {
	args: {
		onChange: undefined,
		note: "A company constraint’s type can’t be changed. Add a new constraint instead.",
	},
};
