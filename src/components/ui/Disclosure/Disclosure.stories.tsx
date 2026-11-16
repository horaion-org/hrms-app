import type { Meta, StoryObj } from "@storybook/react-vite";
import { Disclosure } from "@/components/ui/Disclosure";

const meta = {
	title: "UI/Disclosure",
	component: Disclosure,
	parameters: { layout: "padded" },
	args: {
		title: "More options",
		className: "max-w-md",
		children: (
			<p className="text-sm text-neutral-800">
				Settings most people leave as they are.
			</p>
		),
	},
} satisfies Meta<typeof Disclosure>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = { args: { defaultOpen: true } };
