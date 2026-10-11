import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProgressBar, progressBarTones } from "@/components/ui/ProgressBar";

const meta = {
	title: "UI/ProgressBar",
	component: ProgressBar,
	args: { value: 64, label: "Resolved", tone: "brand", className: "w-80" },
	argTypes: {
		tone: { control: "select", options: progressBarTones },
		value: { control: { type: "range", min: 0, max: 100 } },
	},
} satisfies Meta<typeof ProgressBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Tones: Story = {
	render: () => (
		<div className="flex w-80 flex-col gap-4">
			{progressBarTones.map((tone, index) => (
				<ProgressBar
					key={tone}
					label={tone}
					tone={tone}
					value={100 - index * 15}
				/>
			))}
		</div>
	),
};
