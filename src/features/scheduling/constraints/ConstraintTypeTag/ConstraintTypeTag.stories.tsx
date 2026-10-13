import type { Meta, StoryObj } from "@storybook/react-vite";
import { CONSTRAINT_CATEGORIES } from "@/features/scheduling/constraints/api";
import { ConstraintTypeTag } from "@/features/scheduling/constraints/ConstraintTypeTag";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/Constraints/ConstraintTypeTag",
	component: ConstraintTypeTag,
	args: { category: "STAFFING" },
	argTypes: {
		category: { control: "select", options: CONSTRAINT_CATEGORIES },
	},
} satisfies Meta<typeof ConstraintTypeTag>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllCategories: Story = {
	render: () => (
		<div className="flex flex-col gap-3 text-xs">
			{CONSTRAINT_CATEGORIES.map((category) => (
				<ConstraintTypeTag key={category} category={category} />
			))}
		</div>
	),
};
