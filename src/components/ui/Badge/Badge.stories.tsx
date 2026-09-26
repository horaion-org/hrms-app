import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge, badgeTones } from "@/components/ui/Badge";

const meta = {
	title: "UI/Badge",
	component: Badge,
	args: {
		children: "Pending",
	},
	argTypes: {
		tone: { control: "select", options: badgeTones },
	},
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongLabel: Story = {
	args: {
		children: "Pending approval from the department manager",
	},
	render: (args) => (
		<div className="w-40">
			<Badge {...args} />
		</div>
	),
};

export const Success: Story = {
	args: { tone: "success", children: "Approved" },
};

export const Warning: Story = {
	args: { tone: "warning", children: "Needs review" },
};

export const Error: Story = {
	args: { tone: "error", children: "Rejected" },
};

export const Neutral: Story = { args: { tone: "neutral" } };

/** Mock order and spacing, using Storybook's built-in centered layout. */
export const AllTones: Story = {
	args: { children: "Placeholder text" },
	parameters: { layout: "centered" },
	render: (args) => (
		<>
			{badgeTones.map((tone) => (
				<Badge {...args} key={tone} className="mr-4 last:mr-0" tone={tone} />
			))}
		</>
	),
};
