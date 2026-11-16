import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { staffingRuleFixture } from "@/features/dashboard/fixtures";
import { StaffingTable } from "@/features/reports/StaffingTable";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

/** The table's first data row. */
const firstRow = (): HTMLElement => {
	const table = screen.getByRole("table", { name: "Staffing by rule" });
	const row = within(table).getAllByRole("row")[1];
	if (!row) throw new Error("The table has a row");
	return row;
};

describe("StaffingTable", () => {
	it("names too few people as the cause, with the days needed and held, and leads to the rule", async () => {
		render(
			<MemoryRouterHarness>
				<StaffingTable rules={[staffingRuleFixture()]} />
			</MemoryRouterHarness>
		);

		const link = await screen.findByRole("link", { name: "Edit rule" });
		const row = firstRow();
		expect(row).toHaveTextContent("Front desk AM");
		expect(row).toHaveTextContent("Front desk, Main branch");
		expect(row).toHaveTextContent("Clerk, Lead");
		expect(row).toHaveTextContent("21 needed · 10 held");
		expect(row).toHaveTextContent("Too few people");
		expect(link).toHaveAttribute("href", "/scheduling?view=constraints");
	});

	it("names one-off gaps, which lead to the gaps on Home", async () => {
		render(
			<MemoryRouterHarness>
				<StaffingTable
					rules={[
						staffingRuleFixture({
							peopleWithTitles: 5,
							holderDaysAWeek: null,
							gapsInRange: 2,
						}),
					]}
				/>
			</MemoryRouterHarness>
		);

		const link = await screen.findByRole("link", { name: "See the gaps" });
		expect(firstRow()).toHaveTextContent("One-off gaps");
		expect(firstRow()).toHaveTextContent("21 needed");
		expect(link).toHaveAttribute("href", "/");
	});

	it("shows no cause where the rule can be staffed and nothing ran short", async () => {
		render(
			<MemoryRouterHarness>
				<StaffingTable
					rules={[
						staffingRuleFixture({
							peopleWithTitles: 5,
							holderDaysAWeek: 25,
							gapsInRange: 0,
						}),
					]}
				/>
			</MemoryRouterHarness>
		);

		await screen.findByRole("table", { name: "Staffing by rule" });
		expect(screen.queryByRole("link")).toBeNull();
	});
});
