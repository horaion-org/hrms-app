import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
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

export const StackedWithCounter: Story = {
	args: {
		"aria-label": undefined,
		leadingIcon: undefined,
		trailingIcon: undefined,
		placeholder: "e.g. Orchard Road",
	},
	render: function Render(args): NonNullable<FunctionComponent> {
		const [value, setValue] = useState("");
		const id = "branch-name-counter";
		return (
			<FormRow
				required
				counter={`${value.length}/100`}
				hint="2–100 characters. Letters, numbers, spaces and . ' & - only."
				htmlFor={id}
				label="Branch name"
				layout="stacked"
			>
				<Input
					{...args}
					required
					aria-describedby={formRowIds(id).hintId}
					id={id}
					maxLength={100}
					value={value}
					onChange={(event) => {
						setValue(event.target.value);
						args.onChange?.(event);
					}}
				/>
			</FormRow>
		);
	},
};

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

/** Beside page actions such as a large Button, e.g. a list's search. */
export const Large: Story = {
	args: { inputSize: "lg", placeholder: "Search Employee" },
};
