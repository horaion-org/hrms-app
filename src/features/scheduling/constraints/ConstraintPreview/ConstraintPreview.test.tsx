import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ConstraintPreview } from "@/features/scheduling/constraints/ConstraintPreview";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("ConstraintPreview", () => {
	it("given_nothingChosenYet_when_rendered_then_readsGreyWordsAndNoCompletenessBadge", () => {
		render(
			<ConstraintPreview
				constraint={{ type: "SHIFT_STAFFING", requirement: null, values: [] }}
			/>
		);

		expect(
			screen.getByRole("region", { name: "How it reads" })
		).toHaveTextContent(
			"How it readsMust or if possible which shift needs at least how many people as which job titles."
		);
		expect(screen.queryByText("Incomplete")).toBeNull();
	});

	it("given_everyPart_when_rendered_then_readsAsTheListWill", () => {
		render(
			<ConstraintPreview
				appliesTo="Everyone rostered in Sales"
				constraint={{
					type: "DAYS_OFF_PER_PERIOD",
					requirement: "SHOULD",
					values: [
						{ field: "COMPARISON", value: "AT_LEAST", name: null },
						{ field: "DAYS_OFF", value: "2", name: null },
						{ field: "PERIOD_WEEKS", value: "1", name: null },
					],
				}}
			/>
		);

		expect(
			screen.getByRole("region", { name: "How it reads" })
		).toHaveTextContent(
			"If possible At least 2 days off every week.Everyone rostered in Sales"
		);
	});
});
