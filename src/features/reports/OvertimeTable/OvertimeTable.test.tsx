import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { overtimeFixture } from "@/features/dashboard/fixtures";
import { OvertimeTable } from "@/features/reports/OvertimeTable";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("OvertimeTable", () => {
	it("shows a department's month against its limit, with who is over it", () => {
		const overtime = overtimeFixture();
		render(
			<OvertimeTable
				departments={overtime.departments}
				nearSharePercent={overtime.nearSharePercent}
			/>
		);

		const table = screen.getByRole("table", { name: "Overtime by month" });
		expect(
			within(table).getByRole("columnheader", {
				name: /At 80% of the limit or more/,
			})
		).toBeInTheDocument();
		const row = within(table).getAllByRole("row")[1];
		if (!row) throw new Error("The table has a row");
		expect(row).toHaveTextContent("Sales");
		expect(row).toHaveTextContent("80 h");
		expect(row).toHaveTextContent("72 h");
		expect(row).toHaveTextContent("Aisha Rahman 74 h (over)");
	});

	it("says when a department has no limit", () => {
		const [sales] = overtimeFixture().departments;
		if (!sales) throw new Error("The fixture has a department");
		render(
			<OvertimeTable
				departments={[{ ...sales, ceilingMinutes: null, members: [] }]}
				nearSharePercent={80}
			/>
		);

		expect(screen.getByText("No limit")).toBeInTheDocument();
		expect(screen.getByText("Nobody")).toBeInTheDocument();
	});
});
