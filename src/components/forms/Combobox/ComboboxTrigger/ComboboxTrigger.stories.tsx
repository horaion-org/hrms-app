import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComboboxTrigger } from "@/components/forms/Combobox/ComboboxTrigger";
const meta = {
	title: "Forms/Combobox/ComboboxTrigger",
	component: ComboboxTrigger,
	args: {
		children: "Select branch heads",
		listId: "example-list",
		"aria-expanded": false,
	},
} satisfies Meta<typeof ComboboxTrigger>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Closed: Story = {};
export const Disabled: Story = { args: { disabled: true } };
