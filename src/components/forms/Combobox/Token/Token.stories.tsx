import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Token } from "@/components/forms/Combobox/Token";
import "@/common/i18n";
const meta = {
	title: "Forms/Combobox/Token",
	component: Token,
	args: { label: "Marcus Lim", onRemove: fn() },
} satisfies Meta<typeof Token>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
