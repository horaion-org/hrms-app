import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { inputStatuses } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import "@/common/i18n";

const meta = {
	title: "Forms/Select",
	component: Select,
	args: {
		"aria-label": "Department",
		options: [
			{ value: "people", label: "People" },
			{ value: "finance", label: "Finance" },
			{ value: "operations", label: "Operations and administration" },
		],
		placeholder: "Choose a department",
		disabled: false,
		onChange: fn(),
	},
	argTypes: {
		status: { control: "select", options: [undefined, ...inputStatuses] },
		disabled: { control: "boolean" },
		emptyText: { control: "text" },
		multiple: { control: "boolean" },
		placeholder: { control: "text" },
		defaultValue: { control: "object" },
		value: { control: "object" },
	},
	render: (args): NonNullable<FunctionComponent> =>
		args.multiple ? (
			<Select
				{...args}
				key="multiple"
				value={typeof args.value === "string" ? [args.value] : args.value}
				defaultValue={
					typeof args.defaultValue === "string"
						? [args.defaultValue]
						: args.defaultValue
				}
			/>
		) : (
			<Select
				{...args}
				key="single"
				value={Array.isArray(args.value) ? args.value[0] : args.value}
				defaultValue={
					Array.isArray(args.defaultValue)
						? args.defaultValue[0]
						: args.defaultValue
				}
			/>
		),
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {};

export const OneSelected: Story = { args: { defaultValue: "finance" } };

export const FullWidth: Story = { args: { className: "w-full" } };

export const Success: Story = {
	args: { status: "success", defaultValue: "finance" },
};

export const Error: Story = { args: { status: "error" } };

export const Disabled: Story = {
	args: { disabled: true, defaultValue: "finance" },
};

export const DisabledWithError: Story = {
	args: { disabled: true, status: "error", defaultValue: "finance" },
};

export const DisabledOptions: Story = {
	args: {
		defaultValue: "finance",
		options: [
			{ value: "people", label: "People" },
			{ value: "finance", label: "Finance", disabled: true },
			{ value: "operations", label: "Operations and administration" },
		],
	},
};

export const EmptyList: Story = { args: { options: [] } };

export const LongList: Story = {
	args: {
		options: Array.from({ length: 30 }, (_, index) => ({
			value: `department-${index + 1}`,
			label: `Department ${index + 1}`,
		})),
	},
	parameters: {
		docs: {
			description: {
				story:
					"Open to review scrolling after about six rows. Move the trigger near the viewport bottom (or reduce the viewport height) to review upward flipping.",
			},
		},
	},
};

export const Multiple: Story = {
	args: { multiple: true, defaultValue: ["people", "finance"] },
};

export const MultiplePlaceholder: Story = {
	args: { multiple: true, defaultValue: [] },
};

export const MultipleOneSelected: Story = {
	args: { multiple: true, defaultValue: ["finance"] },
};

export const ManySelected: Story = {
	args: { multiple: true, defaultValue: ["people", "finance", "operations"] },
};

export const SelectAll: Story = {
	args: {
		multiple: true,
		defaultValue: ["people"],
		selectAllLabel: "Select all",
	},
};

export const CustomSummary: Story = {
	args: {
		multiple: true,
		defaultValue: ["people", "finance"],
		formatSummary: (selected) => `${selected.length} departments`,
	},
};

const SelectAllExample = (): NonNullable<FunctionComponent> => {
	const [value, setValue] = useState<Array<string>>([]);
	return (
		<Select
			multiple
			aria-label="Departments"
			className="w-80"
			formatSummary={(selected) => selected.map((o) => o.label).join(", ")}
			placeholder="Please Select"
			selectAllLabel="Select All"
			value={value}
			options={[
				{ value: "people", label: "People" },
				{ value: "finance", label: "Finance" },
				{ value: "operations", label: "Operations" },
			]}
			onChange={setValue}
		/>
	);
};

export const ControlledSelectAll: Story = {
	render: () => <SelectAllExample />,
};

type FormValues = {
	department: string;
	departments: Array<string>;
};

export const ReactHookForm: Story = {
	render: function ReactHookFormExample(): NonNullable<FunctionComponent> {
		const { control, handleSubmit } = useForm<FormValues>({
			defaultValues: { department: "", departments: [] },
		});
		const [submitted, setSubmitted] = useState<FormValues>();
		return (
			<form
				className="flex max-w-sm flex-col gap-4"
				onSubmit={handleSubmit(setSubmitted)}
			>
				<Controller
					control={control}
					name="department"
					rules={{ required: true }}
					render={({ field, fieldState }) => (
						<Select
							ref={field.ref}
							aria-label="Department"
							name={field.name}
							options={meta.args.options}
							placeholder="Choose a department"
							status={fieldState.invalid ? "error" : undefined}
							value={field.value}
							onChange={field.onChange}
						/>
					)}
				/>
				<Controller
					control={control}
					name="departments"
					rules={{ validate: (value) => value.length > 0 }}
					render={({ field, fieldState }) => (
						<Select
							ref={field.ref}
							multiple
							aria-label="Departments"
							name={field.name}
							options={meta.args.options}
							placeholder="Choose departments"
							status={fieldState.invalid ? "error" : undefined}
							value={field.value}
							onChange={field.onChange}
						/>
					)}
				/>
				<Button type="submit">Submit</Button>
				<output aria-label="Submitted values">
					{submitted ? JSON.stringify(submitted) : "Not submitted"}
				</output>
			</form>
		);
	},
};
