import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { staffingRuleFixture } from "@/features/reports/fixtures";
import { StaffingTable } from "@/features/reports/StaffingTable";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("StaffingTable", () => {
	it("shows a rule asking for more people than hold its titles", () => {
		render(<StaffingTable rules={[staffingRuleFixture()]} />);

		const table = screen.getByRole("table", { name: "Staffing by rule" });
		const row = within(table).getAllByRole("row")[1];
		if (!row) throw new Error("The table has a row");
		expect(row).toHaveTextContent("Front desk AM");
		expect(row).toHaveTextContent("Clerk, Lead");
		expect(row).toHaveTextContent("3");
		expect(row).toHaveTextContent("2");
		expect(row).toHaveTextContent("9");
	});

	it("says so calmly with no rules", () => {
		render(<StaffingTable rules={[]} />);

		expect(screen.getByText("No staffing rules here yet.")).toBeInTheDocument();
	});
});
