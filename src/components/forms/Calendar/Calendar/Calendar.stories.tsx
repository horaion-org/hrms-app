import type { Meta, StoryObj } from "@storybook/react-vite";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { createInstance } from "i18next";
import dayjs from "dayjs";
import { I18nextProvider } from "react-i18next";
import { expect, fn, userEvent, within } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import en from "@/assets/locales/en/translations.json";
import es from "@/assets/locales/es/translations.json";
import { Calendar } from "@/components/forms/Calendar";
import { Button } from "@/components/ui/Button";

const english = createInstance();
const spanish = createInstance();
void english.init({
	lng: "en",
	resources: { en: { translation: en } },
	initAsync: false,
});
void spanish.init({
	lng: "es",
	resources: { es: { translation: es } },
	initAsync: false,
});

const meta = {
	title: "Forms/Calendar",
	component: Calendar,
	argTypes: {
		mode: { control: "inline-radio", options: ["single", "range"] },
		minDate: { control: "text", description: "Inclusive minimum (YYYY-MM-DD)" },
		maxDate: { control: "text", description: "Inclusive maximum (YYYY-MM-DD)" },
	},
	args: {
		"aria-label": "Leave date",
		defaultMonth: "2026-06-01",
		onChange: fn(),
	},
	decorators: [
		(Story, context): NonNullable<FunctionComponent> => (
			<I18nextProvider
				i18n={context.parameters["language"] === "es" ? spanish : english}
			>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof Calendar>;
export default meta;
type Story = StoryObj<typeof Calendar>;

export const Days: Story = { args: { defaultValue: "2026-06-10" } };
export const Months: Story = {
	args: { defaultValue: "2026-06-10" },
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Show months" }));
	},
};
export const Years: Story = {
	args: { defaultValue: "2026-06-10" },
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Show months" }));
		await userEvent.click(canvas.getByRole("button", { name: "Show years" }));
	},
};
export const NoValue: Story = {};
export const MinMax: Story = {
	args: { minDate: "2026-06-10", maxDate: "2026-07-15" },
};
export const DisabledDates: Story = {
	args: {
		isDateDisabled: (date) => {
			const weekday = dayjs(date).day();
			return weekday === 0 || weekday === 6;
		},
	},
};
export const RangeAcrossDisabledDay: Story = {
	args: {
		"aria-label": "Leave dates",
		mode: "range",
		defaultValue: { start: "2026-06-10", end: "2026-06-12" },
		isDateDisabled: (date) => date === "2026-06-11",
	},
};
export const Spanish: Story = {
	args: { "aria-label": "Fecha de ausencia", defaultValue: "2026-06-10" },
	parameters: { language: "es" },
};

export const Range: Story = {
	args: {
		"aria-label": "Leave dates",
		mode: "range",
		defaultValue: { start: "2026-06-10", end: "2026-06-19" },
	},
};

export const RangeAcrossMonths: Story = {
	args: {
		"aria-label": "Leave dates",
		mode: "range",
		defaultValue: { start: "2026-06-29", end: "2026-07-03" },
	},
};

export const DraftRange: Story = {
	args: { "aria-label": "Leave dates", mode: "range" },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(
			canvas.getByRole("gridcell", { name: "Wednesday, 10 June 2026" })
		);
		const end = canvas.getByRole("gridcell", { name: "Friday, 19 June 2026" });
		await userEvent.hover(end);
		await expect(end).toHaveAccessibleDescription("Preview: range end");
		await expect(end).toHaveAttribute("aria-selected", "false");
	},
};

const formSchema = z.object({
	date: z.iso
		.date()
		.nullable()
		.refine((value) => value !== null, "Choose a date"),
	range: z
		.object({ start: z.iso.date(), end: z.iso.date() })
		.nullable()
		.refine((value) => value !== null, "Choose a complete range"),
});
type FormValues = z.input<typeof formSchema>;
type SubmittedValues = z.output<typeof formSchema>;

export const ReactHookForm: Story = {
	render: function ReactHookFormExample(): NonNullable<FunctionComponent> {
		const { control, handleSubmit } = useForm<
			FormValues,
			unknown,
			SubmittedValues
		>({
			defaultValues: { date: null, range: null },
			resolver: zodResolver(formSchema),
		});
		const [submitted, setSubmitted] = useState<SubmittedValues>();
		return (
			<form
				className="flex flex-col gap-4"
				onSubmit={handleSubmit(setSubmitted)}
			>
				<Controller
					control={control}
					name="date"
					render={({ field, fieldState }) => (
						<div>
							<Calendar
								ref={field.ref}
								aria-label="Required date"
								defaultMonth="2026-06-01"
								name={field.name}
								value={field.value}
								onChange={field.onChange}
							/>
							{fieldState.error && (
								<p role="alert">{fieldState.error.message}</p>
							)}
						</div>
					)}
				/>
				<Controller
					control={control}
					name="range"
					render={({ field, fieldState }) => (
						<div>
							<Calendar
								ref={field.ref}
								aria-label="Required range"
								defaultMonth="2026-06-01"
								mode="range"
								name={field.name}
								value={field.value}
								onChange={field.onChange}
							/>
							{fieldState.error && (
								<p role="alert">{fieldState.error.message}</p>
							)}
						</div>
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
