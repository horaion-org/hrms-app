import type { Meta, StoryObj } from "@storybook/react-vite";
import { Chip } from "@/components/ui/Chip";

const meta = {
	title: "UI/Chip",
	component: Chip,
	parameters: { layout: "centered" },
	args: { label: "09:00–13:00" },
} satisfies Meta<typeof Chip>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A time window, as a day of availability shows it. */
export const TimeWindow: Story = {};

/** A shift's name, as a day of shift preferences shows it. */
export const ShiftName: Story = { args: { label: "Morning" } };

/** A label wider than its cell is cut to one line. */
export const LongLabel: Story = {
	args: { label: "Front Desk Afternoon" },
	render: (args) => (
		<div className="w-24">
			<Chip {...args} />
		</div>
	),
};
