import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import type { OverviewSection } from "@/features/dashboard/homeSections";
import { Overview } from "@/features/reports/Overview";
import { overviewOf } from "@/features/reports/overview";
import { overviewFixture } from "@/features/reports/overviewFixture";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const everySection = (): boolean => true;

/** The Overview of the two-Branch fixture, with the sections the person keeps. */
const renderOverview = (
	shown: (section: OverviewSection) => boolean = everySection
): void => {
	render(
		<MemoryRouterHarness>
			<Overview
				grouping="branch"
				overview={{ status: "ready", data: overviewFixture() }}
				shown={shown}
			/>
		</MemoryRouterHarness>
	);
};

describe("Overview", () => {
	it("says in words who needs attention and why, before any figure", async () => {
		renderOverview();

		expect(
			await screen.findByText(
				"North Point, Main branch need attention. North Point is short by 3 over the next 14 days because Duty Manager Day needs 3 a shift and 2 people hold its job titles. 1 person is over the overtime limit this month."
			)
		).toBeInTheDocument();
	});

	it("shows each figure with its status and what it is compared with", async () => {
		renderOverview();

		const short = await screen.findByRole("region", { name: "People short" });
		expect(short).toHaveTextContent("3");
		expect(within(short).getByText("Act")).toBeInTheDocument();
		expect(within(short).getByText("Up 2")).toBeInTheDocument();
		expect(short).toHaveTextContent("on the 14 days before");
		const published = screen.getByRole("region", {
			name: "Next week published",
		});
		expect(published).toHaveTextContent("1of 2 departments");
		expect(within(published).getByText("Watch")).toBeInTheDocument();
		expect(
			within(published).getByRole("img", {
				name: "Next week published: Published 1, Not yet published 1",
			})
		).toBeInTheDocument();
	});

	it("lists each Branch, the one to act on first, and the rule behind the shortfall once", async () => {
		renderOverview();

		const table = await screen.findByRole("table", { name: "Branches" });
		const rows = within(table).getAllByRole("row").slice(1);
		expect(rows[0]).toHaveTextContent("North Point");
		expect(rows[0]).toHaveTextContent("Duty Manager Day");
		expect(rows[1]).toHaveTextContent("Main branch");
		expect(rows[1]).toHaveTextContent("1 over · 0 near");
		const causes = screen.getByRole("region", { name: "Why shifts go short" });
		expect(within(causes).getAllByRole("listitem")).toHaveLength(1);
		expect(causes).toHaveTextContent("Short on 3 shifts.");
	});

	it("leaves next week unsaid, figure and column, for someone who may not read rosters", async () => {
		render(
			<MemoryRouterHarness>
				<Overview
					grouping="branch"
					shown={everySection}
					overview={{
						status: "ready",
						data: { ...overviewFixture(), rostersInReach: false },
					}}
				/>
			</MemoryRouterHarness>
		);

		await screen.findByRole("region", { name: "People short" });
		expect(
			screen.queryByRole("region", { name: "Next week published" })
		).toBeNull();
		expect(
			screen.queryByRole("columnheader", { name: "Next week" })
		).toBeNull();
	});

	it("leaves out a section the person hid", async () => {
		renderOverview((section) => section !== "overview-units");

		await screen.findByRole("region", { name: "People short" });
		expect(screen.queryByRole("table", { name: "Branches" })).toBeNull();
	});

	it("says so when there is no roster to speak of yet", () => {
		const nothing = overviewOf({
			shortages: [],
			shortagesBefore: [],
			rules: [],
			overtime: [],
			thisMonth: "2026-11",
			nextRoster: [],
			rostersInReach: true,
			changes: [],
			changesBefore: [],
			grouping: "branch",
			branchNameOf: () => undefined,
		});
		render(
			<Overview
				grouping="branch"
				overview={{ status: "ready", data: nothing }}
				shown={everySection}
			/>
		);

		expect(screen.getByRole("note")).toHaveTextContent("No rosters here yet.");
	});
});
