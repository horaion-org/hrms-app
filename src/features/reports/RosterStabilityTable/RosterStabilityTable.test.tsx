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

	it("draws each department's reasons as a bar, its length against the one that changed most", () => {
		render(
			<RosterStabilityTable
				departments={[
					rosterChangeDepartmentFixture(),
					rosterChangeDepartmentFixture({
						departmentId: "d-2",
						departmentName: "Kitchen",
						totalChanges: 8,
						reasons: [{ reason: "MANUAL", changes: 8, days: 9 }],
					}),
				]}
			/>
		);

		const sales = screen.getByRole("img", {
			name: /^Changes after publishing in Sales: By hand 3, Leave approved 1,/,
		});
		// Sales changed 4 times against Kitchen's 8, so its bar fills half the track.
		expect(sales.children[0]).toHaveStyle({ width: "37.5%" });
		expect(sales.children[1]).toHaveStyle({ width: "12.5%" });
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
