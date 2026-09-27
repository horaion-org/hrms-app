import type { Meta, StoryObj } from "@storybook/react-vite";
import { Link, linkVariants } from "@/components/ui/Link";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";

const meta = {
	title: "UI/Link",
	component: Link,
	args: {
		to: "/sign-up",
		children: "Signup",
		variant: "action",
	},
	argTypes: {
		variant: { control: "inline-radio", options: linkVariants },
	},
	decorators: [withMemoryRouter],
} satisfies Meta<typeof Link>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Action: Story = {};

export const Muted: Story = {
	args: {
		to: "/forgot-password",
		children: "Having trouble signing in?",
		variant: "muted",
	},
};
