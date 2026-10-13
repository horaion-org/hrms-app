import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConstraintPreview } from "@/features/scheduling/constraints/ConstraintPreview";
import { sentenceSlotsOf } from "@/features/scheduling/constraints/constraintSentence";
import { CONSTRAINT_TYPE_OPTIONS } from "@/features/scheduling/constraints/fixtures";
import "@/common/i18n";

const shiftStaffing = CONSTRAINT_TYPE_OPTIONS[0]!;

const meta = {
	title: "Features/Scheduling/Constraints/ConstraintPreview",
	component: ConstraintPreview,
	parameters: { layout: "padded" },
	args: {
		className: "max-w-138",
		type: shiftStaffing.type,
		slots: sentenceSlotsOf(shiftStaffing),
		words: { REQUIREMENT: "must" },
	},
} satisfies Meta<typeof ConstraintPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Incomplete: Story = {};

export const Complete: Story = {
	args: {
		words: {
			REQUIREMENT: "must",
			COMPARISON: "at least",
			HEADCOUNT: "2",
			JOB_TITLE: "Front Desk Lead and Front Desk Staff",
			SHIFT: "Front Desk AM",
		},
	},
};
