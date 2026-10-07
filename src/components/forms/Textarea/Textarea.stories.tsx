import type { Meta, StoryObj } from "@storybook/react-vite";
import { Textarea } from "@/components/forms/Textarea";
const meta = {
	title: "Forms/Textarea",
	component: Textarea,
	args: { "aria-label": "Reason for rejection", placeholder: "Add a note" },
} satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Invalid: Story = { args: { status: "error", required: true } };
export const Disabled: Story = {
	args: { disabled: true, defaultValue: "Coverage is needed." },
};
