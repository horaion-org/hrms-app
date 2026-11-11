import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConstraintPreview } from "@/features/scheduling/constraints/ConstraintPreview";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/Constraints/ConstraintPreview",
	component: ConstraintPreview,
	parameters: { layout: "padded" },
	args: {
		className: "max-w-138",
		constraint: { type: "SHIFT_STAFFING", requirement: null, values: [] },
	},
} satisfies Meta<typeof ConstraintPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Just chosen: grey words for every part still to fill in. */
export const NothingChosenYet: Story = {};

/** Filled in: reads as it will in the list. */
export const FilledIn: Story = {
	args: {
		appliesTo: "Front Desk AM",
		constraint: {
			type: "SHIFT_STAFFING",
			requirement: "MUST",
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
