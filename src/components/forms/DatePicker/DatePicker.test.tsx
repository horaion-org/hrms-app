import { render, screen, waitFor } from "@testing-library/react";
import { composeStories } from "@storybook/react-vite";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/assets/locales/en/translations.json";
import es from "@/assets/locales/es/translations.json";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { DateRange } from "@/components/forms/Calendar";
import {
	DatePicker,
	type DatePickerProps,
} from "@/components/forms/DatePicker";
import * as stories from "@/components/forms/DatePicker/DatePicker.stories";

it("keeps a draft open until both dates are chosen and returns focus", async () => {
	const user = userEvent.setup();
	const onChange = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<DatePicker
				label="Date range"
				value={{ start: "2026-05-18", end: "2026-06-14" }}
				onChange={onChange}
			/>
		</I18nextProvider>
	);
	const trigger = screen.getByRole("button", { name: /^Date range:/ });
	await user.click(trigger);
	await user.click(screen.getByRole("gridcell", { name: /20 May 2026/ }));
	expect(onChange).not.toHaveBeenCalled();
	await user.click(screen.getByRole("gridcell", { name: /22 May 2026/ }));
	expect(onChange).toHaveBeenCalledWith({
		start: "2026-05-20",
		end: "2026-05-22",
	});
	await waitFor(() => {
		expect(trigger).toHaveFocus();
		expect(trigger).toHaveAttribute("aria-expanded", "false");
	});
});

describe("DatePicker date format", () => {
	it.each([
		["en", "18 May 2026 – 14 Jun 2026", "22 Mar 1987"],
		["es", "18 may 2026 – 14 jun 2026", "22 mar 1987"],
	])(
		"shows dates day first with localised months in %s",
		async (language, range, single) => {
			const i18n = createInstance();
			await i18n.use(initReactI18next).init({
				lng: language,
				resources: { en: { translation: en }, es: { translation: es } },
			});
			render(
				<I18nextProvider i18n={i18n}>
					<DatePicker
						label="Leave"
						value={{ start: "2026-05-18", end: "2026-06-14" }}
						onChange={vi.fn()}
					/>
					<DatePicker
						label="Birth"
						mode="single"
						value="1987-03-22"
						onChange={vi.fn()}
					/>
				</I18nextProvider>
			);
			expect(
				screen.getByRole("button", { name: `Leave: ${range}` })
			).toHaveTextContent(range);
			expect(
				screen.getByRole("button", { name: `Birth: ${single}` })
			).toHaveTextContent(single);
		}
	);
});

describe("DatePicker single mode", () => {
	const renderSingle = (
		props: Partial<Extract<DatePickerProps, { mode: "single" }>> = {}
	): ReturnType<typeof render> =>
		render(
			<I18nextProvider i18n={authTestI18n}>
				<DatePicker
					label="Date of birth"
					mode="single"
					placeholder="Select date"
					onChange={vi.fn()}
					{...props}
				/>
			</I18nextProvider>
		);

	afterEach(() => {
		vi.useRealTimers();
	});

	it("types value and onChange according to the mode", () => {
		type Range = Exclude<DatePickerProps, { mode: "single" }>;
		type Single = Extract<DatePickerProps, { mode: "single" }>;
		expectTypeOf<Range["value"]>().toEqualTypeOf<DateRange>();
		expectTypeOf<Range["onChange"]>().toEqualTypeOf<
			(range: DateRange) => void
		>();
		expectTypeOf<Single["value"]>().toEqualTypeOf<string | undefined>();
		expectTypeOf<Single["onChange"]>().toEqualTypeOf<(value: string) => void>();
		expectTypeOf<{
			label: string;
			value: string;
			onChange: (value: string) => void;
		}>().not.toExtend<DatePickerProps>();
		expectTypeOf<{
			label: string;
			mode: "single";
			value: DateRange;
			onChange: (value: string) => void;
		}>().not.toExtend<DatePickerProps>();
		expectTypeOf<{
			label: string;
			mode: "single";
			onChange: (range: DateRange) => void;
		}>().not.toExtend<DatePickerProps>();
	});

	it("shows the placeholder, then the chosen date in the active language", () => {
		const { rerender } = renderSingle();
		const trigger = screen.getByRole("button", {
			name: "Date of birth: Select date",
		});
		expect(trigger).toHaveTextContent("Select date");
		expect(screen.getByText("Select date")).toHaveClass("text-neutral-500");
		expect(trigger).toHaveClass("h-11", "rounded-lg", "border-neutral-400");
		rerender(
			<I18nextProvider i18n={authTestI18n}>
				<DatePicker
					label="Date of birth"
					mode="single"
					placeholder="Select date"
					value="1987-03-22"
					onChange={vi.fn()}
				/>
			</I18nextProvider>
		);
		expect(trigger).toHaveAccessibleName("Date of birth: 22 Mar 1987");
		expect(screen.getByText("22 Mar 1987")).not.toHaveClass("text-neutral-500");
	});

	it("reports the chosen ISO date, closes and returns focus to the trigger", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		renderSingle({ value: "1987-03-22", onChange });
		const trigger = screen.getByRole("button", { name: /^Date of birth:/ });
		await user.click(trigger);
		expect(
			screen.getByRole("gridcell", { name: /22 March 1987/ })
		).toHaveAttribute("aria-selected", "true");
		await user.click(screen.getByRole("gridcell", { name: /23 March 1987/ }));
		expect(onChange).toHaveBeenCalledExactlyOnceWith("1987-03-23");
		await waitFor(() => {
			expect(trigger).toHaveFocus();
			expect(trigger).toHaveAttribute("aria-expanded", "false");
		});
		expect(screen.queryByRole("grid")).not.toBeInTheDocument();
	});

	it("closes on Escape or an outside click without changing the value", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		renderSingle({ value: "1987-03-22", onChange });
		const trigger = screen.getByRole("button", { name: /^Date of birth:/ });
		await user.click(trigger);
		expect(screen.getByRole("grid")).toBeInTheDocument();
		await user.keyboard("{Escape}");
		await waitFor(() => {
			expect(trigger).toHaveAttribute("aria-expanded", "false");
			expect(trigger).toHaveFocus();
		});
		await user.click(trigger);
		expect(screen.getByRole("grid")).toBeInTheDocument();
		await user.click(document.body);
		await waitFor(() => {
			expect(screen.queryByRole("grid")).not.toBeInTheDocument();
		});
		expect(onChange).not.toHaveBeenCalled();
		expect(trigger).toHaveAccessibleName("Date of birth: 22 Mar 1987");
	});

	it("opens on the nearest allowed month and keeps out-of-limit dates unpickable", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 9, 6, 12));
		const user = userEvent.setup();
		const onChange = vi.fn();
		renderSingle({
			minDate: "2026-06-10",
			maxDate: "2026-07-15",
			isDateDisabled: (date) => date === "2026-07-14",
			onChange,
		});
		await user.click(screen.getByRole("button", { name: /^Date of birth:/ }));
		expect(
			screen.getByRole("button", { name: "Show months" })
		).toHaveTextContent("July 2026");
		const late = screen.getByRole("gridcell", { name: /16 July 2026/ });
		const blocked = screen.getByRole("gridcell", { name: /14 July 2026/ });
		expect(late).toHaveAttribute("aria-disabled", "true");
		expect(blocked).toHaveAttribute("aria-disabled", "true");
		await user.click(late);
		await user.click(blocked);
		expect(onChange).not.toHaveBeenCalled();
		await user.click(screen.getByRole("gridcell", { name: /15 July 2026/ }));
		expect(onChange).toHaveBeenCalledExactlyOnceWith("2026-07-15");
	});

	it("opens on a caller's default month when nothing is chosen", async () => {
		const user = userEvent.setup();
		renderSingle({ defaultMonth: "1990-01-01" });
		await user.click(screen.getByRole("button", { name: /^Date of birth:/ }));
		expect(
			screen.getByRole("button", { name: "Show months" })
		).toHaveTextContent("January 1990");
	});

	it("clears a chosen date only when clearable, reporting an empty value", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		const { unmount } = renderSingle({ value: "1987-03-22", onChange });
		expect(
			screen.queryByRole("button", { name: "Clear date" })
		).not.toBeInTheDocument();
		unmount();
		renderSingle({ clearable: true, value: "1987-03-22", onChange });
		await user.click(screen.getByRole("button", { name: "Clear date" }));
		expect(onChange).toHaveBeenCalledExactlyOnceWith("");
		expect(
			screen.getByRole("button", { name: /^Date of birth:/ })
		).toHaveFocus();
		expect(screen.queryByRole("grid")).not.toBeInTheDocument();
	});

	it("offers no clear action when empty or disabled", () => {
		const { unmount } = renderSingle({ clearable: true });
		expect(
			screen.queryByRole("button", { name: "Clear date" })
		).not.toBeInTheDocument();
		unmount();
		renderSingle({ clearable: true, disabled: true, value: "1987-03-22" });
		expect(
			screen.queryByRole("button", { name: "Clear date" })
		).not.toBeInTheDocument();
	});

	it("wires id, labelling, description and invalid state onto the trigger", () => {
		render(
			<I18nextProvider i18n={authTestI18n}>
				<span id="birth-label">Date of birth</span>
				<span id="birth-error">Choose a date of birth</span>
				<DatePicker
					aria-describedby="birth-error"
					aria-labelledby="birth-label"
					id="birth"
					label="Date of birth"
					mode="single"
					status="error"
					value="1987-03-22"
					onChange={vi.fn()}
				/>
			</I18nextProvider>
		);
		const trigger = screen.getByRole("button", {
			name: "Date of birth 22 Mar 1987",
		});
		expect(trigger).toHaveAttribute("id", "birth");
		expect(trigger).toHaveAttribute("aria-invalid", "true");
		expect(trigger).toHaveClass("border-error-600");
		expect(trigger).toHaveAccessibleDescription("Choose a date of birth");
	});

	it("does not open while disabled", async () => {
		const user = userEvent.setup();
		const onBlur = vi.fn();
		renderSingle({ disabled: true, value: "1987-03-22", onBlur });
		const trigger = screen.getByRole("button", { name: /^Date of birth:/ });
		expect(trigger).toBeDisabled();
		expect(trigger).toHaveClass("bg-neutral-200");
		await user.click(trigger);
		expect(screen.queryByRole("grid")).not.toBeInTheDocument();
	});

	it("round-trips through a React Hook Form Controller inside FormRow", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 5, 10, 12));
		const user = userEvent.setup();
		const { ReactHookForm } = composeStories(stories);
		const { container } = render(<ReactHookForm />);
		const birth = screen.getByRole("button", {
			name: "Date of birth Select date",
		});
		const probation = screen.getByRole("button", {
			name: "Probation end date 31 Dec 2026",
		});
		const output = screen.getByRole("status", { name: "Submitted values" });
		await user.click(screen.getByRole("button", { name: "Submit" }));
		await waitFor(() => expect(birth).toHaveFocus());
		expect(birth).toHaveAttribute("aria-invalid", "true");
		expect(birth).toHaveAccessibleDescription("Choose a date of birth");
		expect(output).toHaveTextContent("Not submitted");
		await user.click(birth);
		await user.click(screen.getByRole("gridcell", { name: /, 3 June 2026/ }));
		await waitFor(() => expect(birth).toHaveFocus());
		expect(birth).toHaveAccessibleName("Date of birth 3 Jun 2026");
		expect(birth).toHaveAttribute("aria-invalid", "false");
		await user.click(screen.getByRole("button", { name: "Clear date" }));
		expect(probation).toHaveAccessibleName("Probation end date Select date");
		expect(
			container.querySelector<HTMLInputElement>('input[name="birthDate"]')
		).toHaveValue("2026-06-03");
		await user.click(screen.getByRole("button", { name: "Submit" }));
		await waitFor(() =>
			expect(output).toHaveTextContent(
				JSON.stringify({ birthDate: "2026-06-03", probationEnd: "" })
			)
		);
	});
});
