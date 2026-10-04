import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppHeader } from "@/components/layout/AppHeader";
import { Avatar } from "@/components/ui/Avatar";

const meta = {
	title: "Layout/AppHeader",
	component: AppHeader,
	parameters: { layout: "fullscreen" },
	args: {
		title: (
			<>
				Welcome, <span className="font-medium text-ink-blue-900">John</span>.
			</>
		),
		actions: <Avatar name="John Doe" />,
	},
	argTypes: {
		title: { control: false },
		actions: { control: false },
	},
} satisfies Meta<typeof AppHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutActions: Story = { args: { actions: undefined } };

export const LongTitle: Story = {
	args: {
		title:
			"Welcome, Maximilian Alexander Featherstonehaugh-Montgomery the Third.",
	},
};
