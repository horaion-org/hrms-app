import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConstraintStatement } from "@/features/scheduling/constraints/ConstraintStatement";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/Constraints/ConstraintStatement",
	component: ConstraintStatement,
	parameters: { layout: "padded" },
	args: {
		className: "max-w-138 text-sm",
		constraint: {
			type: "SHIFT_STAFFING",
			requirement: "MUST",
			values: [
				{ field: "COMPARISON", value: "AT_LEAST", name: null },
				{ field: "HEADCOUNT", value: "2", name: null },
				{ field: "JOB_TITLE", value: "clerk", name: "Clerk" },
				{ field: "JOB_TITLE", value: "lead", name: "Lead" },
				{ field: "SHIFT", value: "front-desk-am", name: "Front desk AM" },
			],
		},
		appliesTo: "Front desk AM",
	},
} satisfies Meta<typeof ConstraintStatement>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A Must constraint in a list row, with who it applies to. */
export const MustWithAppliesTo: Story = {};
/** A type that is always If possible. */
export const AlwaysIfPossible: Story = {
	args: {
		constraint: {
			type: "AVOID_DAYS_OFF_ON",
			requirement: null,
			values: [
				{ field: "WEEKDAY", value: "FRI", name: null },
				{ field: "WEEKDAY", value: "SAT", name: null },
			],
		},
		appliesTo: "Everyone rostered in Sales",
	},
};
/** Being filled in: grey words where nothing is chosen yet. */
export const WithPlaceholders: Story = {
	args: {
		placeholders: true,
		appliesTo: undefined,
		constraint: { type: "SHIFT_STAFFING", requirement: null, values: [] },
	},
};
