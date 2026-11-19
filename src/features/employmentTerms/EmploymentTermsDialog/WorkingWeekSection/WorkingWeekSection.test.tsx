import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, useWatch } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import "@/common/i18n";
import type { FunctionComponent } from "@/common/types";
import type { TermsPreset } from "@/features/employmentTerms/api";
import {
	FIVE_DAY_WEEK,
	PART_TIME_20,
	PART_TIME_BELOW_MINUTES,
	TERMS_PRESETS,
} from "@/features/employmentTerms/fixtures";
import {
	termsFormValuesOf,
	typedWeekOf,
	type TermsFormValues,
} from "@/features/employmentTerms/termsForm";
import { WorkingWeekSection } from "./WorkingWeekSection";

/** The section on a form holding the given terms, as the dialog holds it. */
const SectionOn = ({
	terms,
	onStartFrom = vi.fn(),
}: {
	terms: typeof FIVE_DAY_WEEK;
	onStartFrom?: (preset: TermsPreset) => void;
}): FunctionComponent => {
	const form = useForm<TermsFormValues>({
		defaultValues: termsFormValuesOf(terms),
	});
	const values = useWatch({ control: form.control }) as TermsFormValues;
	return (
		<WorkingWeekSection
			disabled={false}
			form={form}
			idOf={(field) => `terms-${field}`}
			partTimeBelowMinutes={PART_TIME_BELOW_MINUTES}
			values={values}
			week={typedWeekOf(values, PART_TIME_BELOW_MINUTES)}
			startFrom={{
				presets: TERMS_PRESETS.presets,
				failed: false,
				startedFrom: undefined,
				onStartFrom,
			}}
			onAnswer={vi.fn()}
			onNameTyped={vi.fn()}
		/>
	);
};

describe("WorkingWeekSection", () => {
	it("given_aFiveDayWeek_when_rendered_then_theHoursAreAFigureDescribedByTheDay", () => {
		render(<SectionOn terms={FIVE_DAY_WEEK} />);
		expect(screen.getByRole("region", { name: "Working week" })).toBeVisible();
		const hours = screen.getByRole("textbox", { name: "Hours a week" });
		expect(hours).toHaveValue("44");
		expect(hours).toHaveAccessibleDescription(
			/^That is 8 h 48 min a day\./
		);
		expect(screen.getByLabelText("Name")).toHaveValue(FIVE_DAY_WEEK.name);
	});

	it("given_aPartTimeWeek_when_rendered_then_noRestDayIsAsked", () => {
		render(<SectionOn terms={PART_TIME_20} />);
		expect(screen.queryByLabelText("Rest day")).not.toBeInTheDocument();
	});

	it("given_aStartingPoint_when_pressed_then_itIsHandedOn", async () => {
		const onStartFrom = vi.fn();
		render(<SectionOn terms={FIVE_DAY_WEEK} onStartFrom={onStartFrom} />);
		await userEvent.click(
			screen.getByRole("button", { name: /^Full-time, 6 days/ })
		);
		expect(onStartFrom).toHaveBeenCalledWith(TERMS_PRESETS.presets[2]);
	});
});
