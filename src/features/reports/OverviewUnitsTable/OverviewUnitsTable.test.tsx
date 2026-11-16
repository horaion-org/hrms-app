import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { overviewFixture } from "@/features/reports/overviewFixture";
import { OverviewUnitsTable } from "@/features/reports/OverviewUnitsTable";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("OverviewUnitsTable", () => {
	it("gives each unit a row with its status in words, the one to act on first", () => {
		render(
			<OverviewUnitsTable
				rostersInReach
				grouping="branch"
				units={overviewFixture().units}
			/>
		);

		const rows = within(screen.getByRole("table", { name: "Branches" }))
			.getAllByRole("row")
			.slice(1);
		expect(rows[0]).toHaveTextContent("North Point");
		expect(within(rows[0]!).getByText("Act")).toHaveClass("bg-error-100");
		expect(rows[0]).toHaveTextContent("0 of 1 published");
		expect(rows[1]).toHaveTextContent("1 of 1 published");
	});

	it("says what a column hidden on a phone holds, on the row's own line, and nothing for none", () => {
		render(
			<OverviewUnitsTable
				rostersInReach
				grouping="branch"
				units={overviewFixture().units}
			/>
		);

		const rows = within(screen.getByRole("table", { name: "Branches" }))
			.getAllByRole("row")
			.slice(1);
		expect(rows[0]).not.toHaveTextContent("after publishing");
		expect(rows[1]).toHaveTextContent("4 changes after publishing");
	});

	it("names its rows Departments within one Branch", () => {
		render(
			<OverviewUnitsTable
				rostersInReach
				grouping="department"
				units={overviewFixture().units}
			/>
		);

		expect(
			screen.getByRole("table", { name: "Departments" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: "Department" })
		).toBeInTheDocument();
	});
});
