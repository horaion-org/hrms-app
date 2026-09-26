import type { Meta, StoryObj } from "@storybook/react-vite";
import { CountBadge } from "@/components/ui/CountBadge";

const meta = {
	title: "UI/Count badge",
	component: CountBadge,
	args: { count: 5, tone: "active" },
	argTypes: {
		count: { control: "number" },
		tone: {
			control: "inline-radio",
			options: ["active", "inactive", "disabled"],
		},
	},
} satisfies Meta<typeof CountBadge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Active: Story = {};
export const Inactive: Story = { args: { tone: "inactive" } };
export const Disabled: Story = { args: { tone: "disabled" } };
/** A zero count renders nothing. Change the count control to reveal it. */
export const Zero: Story = { args: { count: 0 } };
export const Capped: Story = { args: { count: 150 } };
