import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { PeopleIcon, TimeIcon } from "@/components/ui/Icon";
import { ConstraintSection } from "@/features/scheduling/constraints/ConstraintSection";

const meta = {
	title: "Features/Scheduling/Constraints/ConstraintSection",
	component: ConstraintSection,
	parameters: { layout: "padded" },
	args: {
		title: "People on shifts",
		description: "Who must be on each shift, and how many.",
		icon: PeopleIcon,
		count: 2,
		add: { label: "Add", onAdd: fn() },
		children: (
			<>
				<li className="px-6 py-4">Night cover</li>
				<li className="px-6 py-4">Day operator cap</li>
			</>
		),
	},
} satisfies Meta<typeof ConstraintSection>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A purpose with its rows and an Add. */
export const WithRows: Story = {};

/** A purpose the department has none of. */
export const Empty: Story = {
	args: {
		title: "Rest and hours",
		description: "Limits on hours, overtime and rest between shifts.",
		icon: TimeIcon,
		count: 0,
		children: undefined,
		emptyText: "Control Room has none of its own. The company’s limits apply.",
	},
};

/** A foldable section, closed: its heading folds it and it says its gist. */
export const Closed: Story = {
	args: {
		collapse: {
			open: false,
			onToggle: fn(),
			gist: "2 constraints · 1 needs attention",
		},
	},
};
