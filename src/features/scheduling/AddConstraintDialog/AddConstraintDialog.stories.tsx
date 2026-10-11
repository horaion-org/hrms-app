import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { AddConstraintDialog } from "@/features/scheduling/AddConstraintDialog";
import { rolesOf } from "@/features/scheduling/scheduleDraft";
import { SHIFT_FIXTURES as shifts } from "@/features/scheduling/shifts/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/AddConstraintDialog",
	component: AddConstraintDialog,
	args: {
		roles: rolesOf(shifts),
		shifts,
		onSubmit: fn(),
		onClose: fn(),
	},
} satisfies Meta<typeof AddConstraintDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NothingToChoose: Story = { args: { roles: [], shifts: [] } };
