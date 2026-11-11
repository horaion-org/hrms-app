import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
	SHIFT_FIXTURES,
	departmentShiftFixture,
} from "@/features/scheduling/shifts/fixtures";
import { ShiftTable } from "@/features/scheduling/shifts/ShiftTable";
import "@/common/i18n";

const shifts = SHIFT_FIXTURES.map((shift, index) => ({
	...departmentShiftFixture(shift),
	...(index % 2 === 1 && { departmentId: "d-2", departmentName: "Bar" }),
}));

const meta = {
	title: "Features/Scheduling/Shifts/ShiftTable",
	component: ShiftTable,
	parameters: { layout: "padded" },
	args: { shifts, onEdit: fn(), onDelete: fn() },
} satisfies Meta<typeof ShiftTable>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One department chosen: its shifts, without Branch or Department columns. */
export const OneDepartment: Story = {};

/** Every department in reach: each row names its Branch and Department. */
export const AcrossDepartments: Story = {
	args: { showBranch: true, showDepartment: true },
};

/** Bar's rows offer Delete only: the person holds the delete key there but not the update key. */
export const DeleteOnlyInBar: Story = {
	args: {
		showDepartment: true,
		canEdit: (shift) => shift.departmentName !== "Bar",
	},
};

export const Empty: Story = { args: { shifts: [] } };
