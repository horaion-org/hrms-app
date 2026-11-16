import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ConstraintRow } from "@/features/scheduling/constraints/ConstraintRow";
import {
	COMPANY_CONSTRAINT_FIXTURES,
	CONSTRAINT_FIXTURES,
	CONSTRAINT_TYPE_OPTIONS,
} from "@/features/scheduling/constraints/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/Constraints/ConstraintRow",
	component: ConstraintRow,
	parameters: { layout: "padded" },
	decorators: [
		(Story) => (
			<ul className="max-w-200 rounded-xl border border-neutral-400">
				<Story />
			</ul>
		),
	],
	args: {
		constraint: CONSTRAINT_FIXTURES[0]!,
		types: CONSTRAINT_TYPE_OPTIONS,
		needsAttention: false,
		onEdit: fn(),
		onDelete: fn(),
	},
} satisfies Meta<typeof ConstraintRow>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A department's own constraint. */
export const Own: Story = {};

/** One that can never be met: red, with Fix. */
export const NeedsAttention: Story = {
	args: {
		needsAttention: true,
		capacity: {
			headcount: 3,
			peopleWithTitles: 2,
			jobTitleNames: ["Supervisor"],
		},
	},
};

/** A locked company constraint, offered to make stricter. */
export const Company: Story = {
	args: {
		constraint: COMPANY_CONSTRAINT_FIXTURES[0]!,
		onEdit: undefined,
		onDelete: undefined,
		onReplace: fn(),
	},
};
