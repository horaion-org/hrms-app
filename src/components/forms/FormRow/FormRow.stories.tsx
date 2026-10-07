import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import "@/common/i18n";

const meta = {
	title: "Forms/FormRow",
	component: FormRow,
	parameters: { layout: "padded" },
	args: {
		htmlFor: "workspace-name",
		label: "Workspace name",
		children: null,
	},
	argTypes: {
		children: { control: false },
		error: { control: "text" },
	},
	render: (args): NonNullable<FunctionComponent> => (
		<FormRow {...args}>
			<Input
				className="w-full"
				defaultValue="Horaion"
				id={args.htmlFor}
				maxLength={100}
				required={args.required}
				status={args.error ? "error" : undefined}
				aria-describedby={
					args.error
						? formRowIds(args.htmlFor).errorId
						: args.hint != null
							? formRowIds(args.htmlFor).hintId
							: undefined
				}
			/>
		</FormRow>
	),
} satisfies Meta<typeof FormRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithInput: Story = {};

export const StackedWithHelperAndCounter: Story = {
	args: {
		layout: "stacked",
		required: true,
		hint: "Use 2 to 100 characters.",
		counter: "7/100",
	},
};

export const StackedWithErrorAndCounter: Story = {
	args: {
		...StackedWithHelperAndCounter.args,
		error: "This name is already in use.",
	},
};

export const WithError: Story = {
	args: { error: "This field is required." },
};

/** Select is labelled through `aria-labelledby`, since it is a button. */
export const WithSelect: Story = {
	args: { htmlFor: "date-format", label: "Date format" },
	render: (args): NonNullable<FunctionComponent> => (
		<FormRow {...args}>
			<Select
				aria-labelledby={formRowIds(args.htmlFor).labelId}
				className="w-full"
				defaultValue="dmy"
				options={[
					{ value: "dmy", label: "DD MM YYYY" },
					{ value: "mdy", label: "MM DD YYYY" },
					{ value: "ymd", label: "YYYY MM DD" },
				]}
			/>
		</FormRow>
	),
};

/** Below `sm` the label stacks above its field. */
export const Narrow: Story = {
	parameters: { viewport: { defaultViewport: "mobile1" } },
	render: (args): NonNullable<FunctionComponent> => (
		<div className="max-w-xs">
			<FormRow {...args}>
				<Input className="w-full" defaultValue="Horaion" id={args.htmlFor} />
			</FormRow>
		</div>
	),
};

/** In a half-width card the field column takes a share of the row, so a longer label stays on one line. */
export const SharedFieldWidth: Story = {
	args: {
		htmlFor: "probation-end-date",
		label: "Probation end date",
		fieldWidth: "sm:w-[52.5%]",
	},
	render: (args): NonNullable<FunctionComponent> => (
		<div className="w-120 max-w-full">
			<FormRow {...args}>
				<Input className="w-full" id={args.htmlFor} />
			</FormRow>
		</div>
	),
};
