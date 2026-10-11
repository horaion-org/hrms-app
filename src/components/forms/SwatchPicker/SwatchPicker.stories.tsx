import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { inputStatuses } from "@/components/forms/Input";
import { SwatchPicker } from "@/components/forms/SwatchPicker";

const options = [
	{ value: "#D4683F", label: "Terracotta" },
	{ value: "#E9A55A", label: "Orange" },
	{ value: "#8E9A3B", label: "Olive" },
	{ value: "#6E9E7E", label: "Green" },
	{ value: "#8DB5EA", label: "Sky blue" },
	{ value: "#8A6CA6", label: "Purple" },
	{ value: "#A94F62", label: "Maroon" },
	{ value: "#BDBAB3", label: "Grey" },
];

const meta = {
	title: "Forms/SwatchPicker",
	component: SwatchPicker,
	args: {
		"aria-label": "Shift colour",
		options,
		onChange: fn(),
	},
	argTypes: {
		status: { control: "select", options: [undefined, ...inputStatuses] },
		disabled: { control: "boolean" },
	},
} satisfies Meta<typeof SwatchPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NothingChosen: Story = {};

export const Chosen: Story = { args: { value: "#8DB5EA" } };

export const Error: Story = { args: { status: "error" } };

export const Disabled: Story = { args: { disabled: true, value: "#8A6CA6" } };

const InteractiveDemo = (): FunctionComponent => {
	const [value, setValue] = useState<string>();
	return (
		<SwatchPicker
			aria-label="Shift colour"
			options={options}
			value={value}
			onChange={setValue}
		/>
	);
};

export const Interactive: Story = { render: () => <InteractiveDemo /> };
