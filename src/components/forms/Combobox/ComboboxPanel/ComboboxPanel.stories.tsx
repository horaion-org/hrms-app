import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComboboxPanel } from "@/components/forms/Combobox/ComboboxPanel";
const meta = {
	title: "Forms/Combobox/ComboboxPanel",
	component: ComboboxPanel,
	args: {
		children: "Panel content",
		className: "rounded-lg border border-neutral-400 bg-white p-4 shadow-sm",
	},
} satisfies Meta<typeof ComboboxPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
