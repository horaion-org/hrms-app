import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ConstraintTypeChooser } from "@/features/scheduling/constraints/ConstraintTypeChooser";
import { typeGroupsOf } from "@/features/scheduling/constraints/ConstraintDialog/typeGroups";
import { CONSTRAINT_TYPE_OPTIONS } from "@/features/scheduling/constraints/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/Constraints/ConstraintTypeChooser",
	component: ConstraintTypeChooser,
	parameters: { layout: "padded" },
	args: {
		groups: typeGroupsOf(CONSTRAINT_TYPE_OPTIONS),
		value: "",
		onChange: fn(),
	},
} satisfies Meta<typeof ConstraintTypeChooser>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Nothing chosen yet: every kind the API offers, under its category. */
export const NothingChosen: Story = {};

/** One kind chosen. */
export const OneChosen: Story = { args: { value: "SHIFT_STAFFING" } };
