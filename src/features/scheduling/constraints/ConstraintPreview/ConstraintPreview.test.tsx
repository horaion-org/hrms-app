import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ConstraintPreview } from "@/features/scheduling/constraints/ConstraintPreview";
import { CONSTRAINT_TYPE_OPTIONS } from "@/features/scheduling/constraints/fixtures";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const shiftStaffing = CONSTRAINT_TYPE_OPTIONS[0]!;
const daysOff = CONSTRAINT_TYPE_OPTIONS[3]!;
const fieldsOf = (
	option: typeof shiftStaffing
): Array<(typeof option.fields)[number]["field"]> =>
	option.fields.map((spec) => spec.field);

describe("ConstraintPreview", () => {
	it("given_missingParts_when_rendered_then_showsTheirLabelsAndIncomplete", () => {
		render(
			<ConstraintPreview
				constraint={{ type: "SHIFT_STAFFING", values: [] }}
				fields={fieldsOf(shiftStaffing)}
			/>
		);

		expect(screen.getByText("Incomplete")).toBeInTheDocument();
		expect(screen.getByRole("paragraph")).toHaveTextContent(
			"Shifts needs at least Headcount people as Job titles."
		);
		expect(screen.getByText("Headcount")).toHaveClass("bg-neutral-300");
	});

	it("given_everyPart_when_rendered_then_readsTheConstraintAsComplete", () => {
		render(
			<ConstraintPreview
				fields={fieldsOf(daysOff)}
				constraint={{
					type: "DAYS_OFF_PER_PERIOD",
					values: [
						{ field: "COMPARISON", value: "AT_LEAST", name: null },
						{ field: "DAYS_OFF", value: "2", name: null },
						{ field: "PERIOD_DAYS", value: "7", name: null },
					],
				}}
			/>
		);

		expect(screen.getByText("Complete")).toBeInTheDocument();
		expect(screen.getByRole("paragraph")).toHaveTextContent(
			"Everyone gets at least 2 days off in any 7 days in a row."
		);
		expect(screen.getByText("2")).toHaveClass("bg-ink-blue-50");
	});
});
