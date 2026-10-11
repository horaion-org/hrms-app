import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { RulePreview } from "@/features/scheduling/RulePreview";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("RulePreview", () => {
	it("given_missingParts_when_rendered_then_showsPlaceholdersAndIncomplete", () => {
		render(<RulePreview values={{ requirement: "must" }} />);

		expect(screen.getByText("Incomplete")).toBeInTheDocument();
		expect(screen.getByRole("paragraph")).toHaveTextContent(
			"There must be condition headcount employees with roles role assigned to the shift shifts."
		);
		expect(screen.getByText("condition")).toHaveClass("bg-neutral-300");
		expect(screen.getByText("must")).toHaveClass("bg-ink-blue-50");
	});

	it("given_everyPart_when_rendered_then_readsTheRuleAsComplete", () => {
		render(
			<RulePreview
				values={{
					requirement: "must not",
					condition: "at most",
					headcount: "3",
					roles: "Cashier",
					shifts: "Lunch Rush",
				}}
			/>
		);

		expect(screen.getByText("Complete")).toBeInTheDocument();
		expect(screen.getByRole("paragraph")).toHaveTextContent(
			"There must not be at most 3 employees with roles Cashier assigned to the Lunch Rush shifts."
		);
	});
});
