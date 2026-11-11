import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConstraintPreview } from "@/features/scheduling/constraints/ConstraintPreview";
import { CONSTRAINT_TYPE_OPTIONS } from "@/features/scheduling/constraints/fixtures";
import "@/common/i18n";

const shiftStaffing = CONSTRAINT_TYPE_OPTIONS[0]!;

const meta = {
	title: "Features/Scheduling/Constraints/ConstraintPreview",
	component: ConstraintPreview,
	parameters: { layout: "padded" },
	args: {
		className: "max-w-138",
		constraint: { type: shiftStaffing.type, values: [] },
		fields: shiftStaffing.fields.map((spec) => spec.field),
	},
} satisfies Meta<typeof ConstraintPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Incomplete: Story = {};

export const Complete: Story = {
	args: {
		constraint: {
			type: shiftStaffing.type,
			values: [
				{ field: "COMPARISON", value: "AT_LEAST", name: null },
				{ field: "HEADCOUNT", value: "2", name: null },
				{
					field: "JOB_TITLE",
					value: "front-desk-lead",
					name: "Front Desk Lead",
				},
				{
					field: "JOB_TITLE",
					value: "front-desk-staff",
					name: "Front Desk Staff",
				},
				{ field: "SHIFT", value: "front-desk-am", name: "Front Desk AM" },
			],
		},
	},
};
