import { useId, useState, type ReactElement } from "react";
import { Controller, useForm } from "react-hook-form";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { authTestI18n } from "@/features/auth/testingI18n";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import {
	DatePicker,
	type DatePickerProps,
} from "@/components/forms/DatePicker";
import { Button } from "@/components/ui/Button";

type RangeProps = Exclude<DatePickerProps, { mode: "single" }>;
type SingleProps = Extract<DatePickerProps, { mode: "single" }>;

/* Each example keeps its own value so the stories stay interactive. */
const RangeExample = (args: RangeProps): ReactElement => {
	const [value, setValue] = useState(args.value);
	return <DatePicker {...args} value={value} onChange={setValue} />;
};

const SingleExample = (args: SingleProps): ReactElement => {
	const [value, setValue] = useState(args.value);
	return (
		<div className="w-95">
			<DatePicker
				{...args}
				value={value}
				onChange={(next: string) => {
					setValue(next);
					args.onChange(next);
				}}
			/>
		</div>
	);
};

const meta = {
	title: "Forms/DatePicker",
	component: DatePicker,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	render: (args): ReactElement =>
		args.mode === "single" ? (
			<SingleExample {...args} />
		) : (
			<RangeExample {...args} />
		),
} satisfies Meta<typeof DatePicker>;
export default meta;
type Story = StoryObj<typeof DatePicker>;
export const Default: Story = {
	args: {
		label: "Date range",
		value: { start: "2026-05-18", end: "2026-06-14" },
		onChange: (): void => {},
	},
};

const single = {
	mode: "single",
	label: "Date of birth",
	placeholder: "Select date",
	onChange: fn(),
} satisfies SingleProps;

export const Single: Story = { args: single };
export const SingleWithValue: Story = {
	args: { ...single, value: "1987-03-22" },
};
export const SingleWithLimits: Story = {
	args: {
		...single,
		label: "Hire date",
		minDate: "2026-06-10",
		maxDate: "2026-07-15",
		isDateDisabled: (date) => date === "2026-06-12",
	},
};
export const SingleClearable: Story = {
	args: {
		...single,
		label: "Probation end date",
		value: "2026-12-31",
		clearable: true,
	},
};
export const SingleError: Story = {
	args: { ...single, status: "error" },
};
export const SingleDisabled: Story = {
	args: { ...single, value: "1987-03-22", disabled: true },
};

type FormValues = { birthDate: string; probationEnd: string };

export const ReactHookForm: Story = {
	render: function ReactHookFormExample(): ReactElement {
		const formId = useId();
		const birthIds = formRowIds(`${formId}-birth`);
		const probationIds = formRowIds(`${formId}-probation`);
		const { control, handleSubmit, formState } = useForm<FormValues>({
			defaultValues: { birthDate: "", probationEnd: "2026-12-31" },
		});
		const [submitted, setSubmitted] = useState<FormValues>();
		return (
			<form
				noValidate
				className="flex max-w-xl flex-col gap-6"
				onSubmit={handleSubmit(setSubmitted)}
			>
				<FormRow
					required
					error={formState.errors.birthDate?.message}
					htmlFor={`${formId}-birth`}
					label="Date of birth"
				>
					<Controller
						control={control}
						name="birthDate"
						rules={{ required: "Choose a date of birth" }}
						render={({ field, fieldState }) => (
							<DatePicker
								ref={field.ref}
								aria-describedby={fieldState.error && birthIds.errorId}
								aria-invalid={fieldState.invalid}
								aria-labelledby={birthIds.labelId}
								id={`${formId}-birth`}
								label="Date of birth"
								maxDate="2026-10-06"
								mode="single"
								name={field.name}
								placeholder="Select date"
								status={fieldState.invalid ? "error" : undefined}
								value={field.value}
								onBlur={field.onBlur}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormRow>
				<FormRow htmlFor={`${formId}-probation`} label="Probation end date">
					<Controller
						control={control}
						name="probationEnd"
						render={({ field }) => (
							<DatePicker
								ref={field.ref}
								clearable
								aria-labelledby={probationIds.labelId}
								id={`${formId}-probation`}
								label="Probation end date"
								mode="single"
								name={field.name}
								placeholder="Select date"
								value={field.value}
								onBlur={field.onBlur}
								onChange={field.onChange}
							/>
						)}
					/>
				</FormRow>
				<Button type="submit">Submit</Button>
				<output aria-label="Submitted values">
					{submitted ? JSON.stringify(submitted) : "Not submitted"}
				</output>
			</form>
		);
	},
};
