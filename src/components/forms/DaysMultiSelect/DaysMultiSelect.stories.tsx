import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { DaysMultiSelect } from "@/components/forms/DaysMultiSelect";
import "@/common/i18n";

const meta = {
	title: "Forms/DaysMultiSelect",
	component: DaysMultiSelect,
	args: {
		"aria-label": "Days",
		className: "w-60",
		placeholder: "Please select",
		selectAllLabel: "Select all",
		onChange: fn(),
	},
} satisfies Meta<typeof DaysMultiSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Weekdays: Story = {
	args: { value: ["MON", "TUE", "WED", "THU", "FRI"] },
};
