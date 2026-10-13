import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ConstraintPreview } from "@/features/scheduling/constraints/ConstraintPreview";
import { sentenceSlotsOf } from "@/features/scheduling/constraints/constraintSentence";
import { CONSTRAINT_TYPE_OPTIONS } from "@/features/scheduling/constraints/fixtures";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const shiftStaffing = CONSTRAINT_TYPE_OPTIONS[0]!;
const daysOff = CONSTRAINT_TYPE_OPTIONS[3]!;

describe("ConstraintPreview", () => {
	it("given_missingParts_when_rendered_then_showsTheirLabelsAndIncomplete", () => {
		render(
			<ConstraintPreview
				slots={sentenceSlotsOf(shiftStaffing)}
				type="SHIFT_STAFFING"
				words={{ REQUIREMENT: "must" }}
			/>
		);

		expect(screen.getByText("Incomplete")).toBeInTheDocument();
		expect(screen.getByRole("paragraph")).toHaveTextContent(
			"Staff on Shifts, counting Job titles, must total Comparison Headcount."
		);
		expect(screen.getByText("Headcount")).toHaveClass("bg-neutral-300");
		expect(screen.getByText("must")).toHaveClass("bg-ink-blue-50");
	});

	it("given_everyPart_when_rendered_then_readsTheConstraintAsComplete", () => {
		render(
			<ConstraintPreview
				slots={sentenceSlotsOf(daysOff)}
				type="DAYS_OFF_PER_PERIOD"
				words={{
					REQUIREMENT: "should",
					COMPARISON: "at least",
					DAYS_OFF: "2",
					PERIOD_DAYS: "7",
				}}
			/>
		);

		expect(screen.getByText("Complete")).toBeInTheDocument();
		expect(screen.getByRole("paragraph")).toHaveTextContent(
			"Days off for everyone in any 7-day period should be at least 2."
		);
	});
});
