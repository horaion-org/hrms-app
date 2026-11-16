import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ReportSection } from "@/features/reports/ReportSection";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("ReportSection", () => {
	it("heads its table with the analysis' title once answered", () => {
		render(
			<ReportSection id="overtime" read={{ status: "ready", data: "answer" }}>
				{(data) => <p>{data}</p>}
			</ReportSection>
		);

		expect(
			screen.getByRole("region", { name: "Overtime by month" })
		).toHaveTextContent("answer");
	});

	it("says when its read failed", () => {
		render(
			<ReportSection id="stability" read={{ status: "error" }}>
				{() => null}
			</ReportSection>
		);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"We couldn’t load this table."
		);
	});

	it("is left out where its read is out of reach", () => {
		const { container } = render(
			<ReportSection id="staffing" read={{ status: "hidden" }}>
				{() => null}
			</ReportSection>
		);

		expect(container).toBeEmptyDOMElement();
	});
});
