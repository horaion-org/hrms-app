import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "@/components/ui/Avatar";

const meta = {
	title: "UI/Avatar",
	component: Avatar,
	args: { name: "John Doe" },
	parameters: { layout: "centered" },
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SingleName: Story = { args: { name: "Aisha" } };

export const LongName: Story = { args: { name: "Jane Mary Tan" } };
