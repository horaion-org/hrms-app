import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import { Toaster } from "@/components/ui/Toaster";
import { useToastStore, type Toast } from "@/store/useToastStore";

const seed = (toasts: Array<Toast>): Meta["decorators"] => [
	(Story): NonNullable<FunctionComponent> => {
		useToastStore.setState({ toasts });
		return <Story />;
	},
];

const meta = {
	title: "UI/Toaster",
	component: Toaster,
} satisfies Meta<typeof Toaster>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Success: Story = {
	decorators: seed([
		{
			id: 1,
			tone: "success",
			message: "Email confirmed. You can log in now.",
		},
	]),
};

export const Error: Story = {
	decorators: seed([
		{ id: 1, tone: "error", message: "Invalid verification code provided." },
	]),
};

export const Stacked: Story = {
	decorators: seed([
		{ id: 1, tone: "success", message: "We sent another code." },
		{
			id: 2,
			tone: "error",
			message: "Attempt limit exceeded, please try later.",
		},
	]),
};

export const Empty: Story = { decorators: seed([]) };
