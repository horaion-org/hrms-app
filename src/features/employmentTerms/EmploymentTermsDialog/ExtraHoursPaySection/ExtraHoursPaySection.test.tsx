import { render, screen } from "@testing-library/react";
import { useForm, useWatch } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import "@/common/i18n";
import type { FunctionComponent } from "@/common/types";
import type { TermsOverviewItem } from "@/features/employmentTerms/api";
import {
	FIVE_DAY_WEEK,
	PART_TIME_BELOW_MINUTES,
	TERMS_PRESETS,
} from "@/features/employmentTerms/fixtures";
import {
	termsFormValuesOf,
	typedWeekOf,
	type TermsFormValues,
} from "@/features/employmentTerms/termsForm";
import { ExtraHoursPaySection } from "./ExtraHoursPaySection";

const OVERTIME_RATE = "An overtime hour is paid at times a normal hour";
const REST_DAY_RATE = "Work on the rest day counts at times a normal hour";
const PAID_AS = "How extra hours are paid";

/** The section on a form holding the given terms, as the dialog holds it. */
const SectionOn = ({
	terms,
}: {
	terms: TermsOverviewItem;
}): FunctionComponent => {
	const form = useForm<TermsFormValues>({
		defaultValues: termsFormValuesOf(terms),
	});
	const values = useWatch({ control: form.control }) as TermsFormValues;
	return (
		<ExtraHoursPaySection
			disabled={false}
			form={form}
			idOf={(field) => `terms-${field}`}
			presets={TERMS_PRESETS}
			values={values}
			week={typedWeekOf(values, PART_TIME_BELOW_MINUTES)}
			onAnswer={vi.fn()}
		/>
	);
};

describe("ExtraHoursPaySection", () => {
	it("given_coveredTerms_when_rendered_then_asksTheRatesAndNotHowExtraHoursArePaid", () => {
		render(<SectionOn terms={FIVE_DAY_WEEK} />);
		expect(
			screen.getByRole("region", { name: "Pay for extra hours" })
		).toBeVisible();
		expect(screen.getByRole("textbox", { name: OVERTIME_RATE })).toHaveValue(
			"1.5"
		);
		expect(screen.getByRole("textbox", { name: REST_DAY_RATE })).toHaveValue(
			"2"
		);
		expect(
			screen.queryByRole("radiogroup", { name: PAID_AS })
		).not.toBeInTheDocument();
	});

	it("given_notCoveredAndNothingExtra_when_rendered_then_asksNoRate", () => {
		render(
			<SectionOn
				terms={{
					...FIVE_DAY_WEEK,
					hoursLimitsApply: false,
					extraHoursPaidAs: "NOTHING",
				}}
			/>
		);
		expect(screen.getByRole("radiogroup", { name: PAID_AS })).toBeVisible();
		expect(
			screen.queryByRole("textbox", { name: OVERTIME_RATE })
		).not.toBeInTheDocument();
	});

	it("given_notCoveredAndPaidAtARate_when_rendered_then_theRateFollowsTheChoice", () => {
		render(
			<SectionOn
				terms={{
					...FIVE_DAY_WEEK,
					hoursLimitsApply: false,
					extraHoursPaidAs: "RATE",
				}}
			/>
		);
		const choice = screen.getByRole("radiogroup", { name: PAID_AS });
		const rate = screen.getByRole("textbox", { name: OVERTIME_RATE });
		expect(
			choice.compareDocumentPosition(rate) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
		expect(screen.getByText("Set the rate below.")).toBeVisible();
	});
});
