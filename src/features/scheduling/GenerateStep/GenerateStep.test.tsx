import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { GenerateStep } from "@/features/scheduling/GenerateStep";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("GenerateStep", () => {
	it("given_aSummary_when_rendered_then_listsEachFigureByName", () => {
		render(<GenerateStep summary={{ shifts: 4, roles: 11, coverage: 91 }} />);

		const list = screen.getByLabelText("Schedule summary");
		const terms = within(list)
			.getAllByRole("term")
			.map((term) => term.textContent);
		const values = within(list)
			.getAllByRole("definition")
			.map((value) => value.textContent);
		expect(terms).toEqual(["Shifts", "Roles", "Coverage"]);
		expect(values).toEqual(["4", "11", "91%"]);
	});

	it("given_theStep_when_rendered_then_saysWhatHappensNext", () => {
		render(<GenerateStep summary={{ shifts: 1, roles: 2, coverage: 100 }} />);

		expect(
			screen.getByRole("region", { name: "Ready to Generate" })
		).toBeInTheDocument();
		expect(screen.getAllByRole("listitem")).toHaveLength(3);
		expect(screen.getByRole("note")).toHaveTextContent(
			"Generation may take a few moments."
		);
	});
});
