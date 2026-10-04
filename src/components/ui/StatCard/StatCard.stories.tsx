import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";

const meta = {
	title: "UI/StatCard",
	component: StatCard,
	args: { title: "Branches", value: "2", caption: "Active Branches" },
	argTypes: { action: { control: false } },
} satisfies Meta<typeof StatCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One card at the design's half-width column. */
const framed: Story["render"] = (args) => (
	<div className="w-132">
		<StatCard {...args} />
	</div>
);

export const Default: Story = { render: framed };

export const WithAction: Story = {
	args: { action: <Button variant="hyperlink">View All</Button> },
	render: framed,
};

export const Unknown: Story = {
	args: { title: "Job Titles", value: "—", caption: "Coming soon" },
	render: framed,
};

/** The design's two-by-two overview grid. */
export const Grid: Story = {
	parameters: { layout: "padded" },
	render: () => (
		<div className="grid max-w-270 grid-cols-2 gap-6">
			<StatCard caption="Active Branches" title="Branches" value="2" />
			<StatCard caption="Active Departments" title="Departments" value="6" />
			<StatCard caption="Configured Jobs" title="Job Titles" value="28" />
			<StatCard caption="Configured Roles" title="System Roles" value="4" />
		</div>
	),
};
