import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { Input, inputStatuses } from "@/components/forms/Input";
import { PlaceholderIcon } from "@/components/ui/Icon";

const meta = {
	title: "Forms/Input",
	component: Input,
	args: {
		"aria-label": "Name",
		disabled: false,
		leadingIcon: <PlaceholderIcon />,
		trailingIcon: <PlaceholderIcon />,
		placeholder: "Enter your name",
		onChange: fn(),
	},
	argTypes: {
		leadingIcon: { control: false },
		trailingIcon: { control: false },
		status: { control: "select", options: [undefined, ...inputStatuses] },
		disabled: { control: "boolean" },
		placeholder: { control: "text" },
		defaultValue: { control: "text" },
		value: { control: "text" },
	},
	render: (args): NonNullable<FunctionComponent> => (
		<Input
			{...args}
			defaultValue={args.value === undefined ? args.defaultValue : undefined}
		/>
	),
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Filled: Story = { args: { defaultValue: "Vernon" } };

export const Placeholder: Story = {};

export const Disabled: Story = {
	args: { disabled: true, defaultValue: "Vernon" },
};

export const Success: Story = {
	args: { status: "success", defaultValue: "Vernon" },
};

export const Error: Story = {
	args: { status: "error", defaultValue: "Vernon" },
};

export const DisabledWithError: Story = {
	args: { disabled: true, status: "error", defaultValue: "Vernon" },
};
