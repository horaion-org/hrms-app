import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { NoConstraintsDialog } from "@/features/scheduling/constraints/NoConstraintsDialog";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/Constraints/NoConstraintsDialog",
	component: NoConstraintsDialog,
	args: { constraintCount: 3, onConfirm: fn(), onClose: fn() },
} satisfies Meta<typeof NoConstraintsDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The department has constraints, but none is ticked for this schedule. */
export const NoneTicked: Story = {};

/** The department has no constraints at all. */
export const DepartmentHasNone: Story = { args: { constraintCount: 0 } };
