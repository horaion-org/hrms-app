import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { rosterChangeDepartmentFixture } from "@/features/reports/fixtures";
import { RosterStabilityTable } from "@/features/reports/RosterStabilityTable";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("RosterStabilityTable", () => {
	it("shows each department's changes after publishing, by reason", () => {
		render(
			<RosterStabilityTable departments={[rosterChangeDepartmentFixture()]} />
		);

		const table = screen.getByRole("table", {
			name: "Changes after publishing",
		});
		const row = within(table).getAllByRole("row")[1];
		if (!row) throw new Error("The table has a row");
		expect(row).toHaveTextContent("Sales");
		expect(row).toHaveTextContent(
			"By hand: 3 (5 days), Leave approved: 1 (1 day)"
		);
	});

	it("names a reason it does not know as Other", () => {
		render(
			<RosterStabilityTable
				departments={[
					rosterChangeDepartmentFixture({
						reasons: [{ reason: "SOMETHING_NEW", changes: 1, days: 2 }],
					}),
				]}
			/>
		);

		expect(screen.getByText("Other: 1 (2 days)")).toBeInTheDocument();
	});
});
