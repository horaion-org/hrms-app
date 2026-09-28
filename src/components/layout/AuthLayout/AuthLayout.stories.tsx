import type { Meta, StoryObj } from "@storybook/react-vite";

import { AuthLayout } from "@/components/layout/AuthLayout";

const meta = {
	title: "Layout/AuthLayout",
	component: AuthLayout,
	parameters: { layout: "fullscreen" },
	args: {
		children: (
			<div className="space-y-4">
				<h1 className="text-xl font-semibold text-neutral-900">Page title</h1>
				<p className="text-sm text-neutral-900/60">
					The page&rsquo;s form renders here.
				</p>
			</div>
		),
	},
} satisfies Meta<typeof AuthLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
