import type { Meta, StoryObj } from "@storybook/react-vite";

import { AuthLayout } from "@/components/layout/AuthLayout";

const meta = {
	title: "Layout/AuthLayout",
	component: AuthLayout,
	parameters: { layout: "fullscreen" },
	args: {
		title: "Page title",
		description: "A line that explains the page.",
		children: (
			<p className="text-sm text-neutral-700">
				The page&rsquo;s form renders here.
			</p>
		),
	},
} satisfies Meta<typeof AuthLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutDescription: Story = {
	args: { description: undefined },
};
