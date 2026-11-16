import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { InsightSection } from "@/features/insights/InsightSection";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("InsightSection", () => {
	it("heads its table with the analysis' title once answered", () => {
		render(
			<InsightSection id="overtime" read={{ status: "ready", data: "answer" }}>
				{(data) => <p>{data}</p>}
			</InsightSection>
		);

		expect(
			screen.getByRole("region", { name: "Overtime by month" })
		).toHaveTextContent("answer");
	});

	it("says when its read failed", () => {
		render(
			<InsightSection id="stability" read={{ status: "error" }}>
				{() => null}
			</InsightSection>
		);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"We couldn’t load this table."
		);
	});

	it("is left out where its read is out of reach", () => {
		const { container } = render(
			<InsightSection id="staffing" read={{ status: "hidden" }}>
				{() => null}
			</InsightSection>
		);

		expect(container).toBeEmptyDOMElement();
	});
});
