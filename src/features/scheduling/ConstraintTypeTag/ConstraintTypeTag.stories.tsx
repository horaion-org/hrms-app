import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConstraintTypeTag } from "@/features/scheduling/ConstraintTypeTag";
import { CONSTRAINT_TYPES } from "@/features/scheduling/scheduleDraft";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/ConstraintTypeTag",
	component: ConstraintTypeTag,
	args: { type: "STAFFING_REQUIREMENT" },
	argTypes: {
		type: { control: "select", options: CONSTRAINT_TYPES },
	},
} satisfies Meta<typeof ConstraintTypeTag>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllTypes: Story = {
	render: () => (
		<div className="flex flex-col gap-3 text-xs">
			{CONSTRAINT_TYPES.map((type) => (
				<ConstraintTypeTag key={type} type={type} />
			))}
		</div>
	),
};
