import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { RateField } from "./RateField";

const meta = {
	title: "Features/EmploymentTerms/EmploymentTermsDialog/RateField",
	component: RateField,
	parameters: { layout: "padded" },
	args: {
		id: "overtime-rate",
		label: "An overtime hour is paid at",
		unit: "times a normal hour",
		hint: "The legal minimum is 1.5. You can pay more.",
		registration: {
			name: "overtimeTimes",
			onChange: fn(),
			onBlur: fn(),
			ref: fn(),
		},
	},
} satisfies Meta<typeof RateField>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A rate with its hint. */
export const WithHint: Story = {};

/** A rate the form refused: the error replaces the hint. */
export const WithError: Story = {
	args: { error: "Enter a rate from 1 to 10 times a normal hour." },
};
