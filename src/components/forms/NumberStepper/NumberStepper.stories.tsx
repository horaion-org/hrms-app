import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { NumberStepper } from "@/components/forms/NumberStepper";
import "@/common/i18n";

const meta = {
	title: "Forms/NumberStepper",
	component: NumberStepper,
	args: {
		label: "Front Desk Staff",
		value: 3,
		onChange: fn(),
	},
} satisfies Meta<typeof NumberStepper>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AtMinimum: Story = { args: { value: 0 } };

export const AtMaximum: Story = { args: { value: 5, max: 5 } };

export const Disabled: Story = { args: { disabled: true } };

const InteractiveDemo = (): FunctionComponent => {
	const [value, setValue] = useState(1);
	return (
		<NumberStepper
			label="Front Desk Lead"
			max={9}
			value={value}
			onChange={setValue}
		/>
	);
};

export const Interactive: Story = { render: () => <InteractiveDemo /> };
