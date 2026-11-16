import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import {
	shortageFixture,
	staffingRuleFixture,
} from "@/features/dashboard/fixtures";
import { ShortShiftsCard } from "@/features/dashboard/ShortShiftsCard";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("ShortShiftsCard", () => {
	it("links each gap to its roster with Find cover open on that day", async () => {
		render(
			<MemoryRouterHarness>
				<ShortShiftsCard
					shortShifts={{
						status: "ready",
						data: {
							unstaffable: [],
							gaps: [shortageFixture({ shortBy: 2 })],
						},
					}}
				/>
			</MemoryRouterHarness>
		);

		const link = await screen.findByRole("link", { name: /Morning/ });
		expect(link).toHaveAttribute(
			"href",
			"/scheduling/s-1?week=2026-11-16&day=2026-11-18&cover=fs-am%7C2026-11-18"
		);
		expect(screen.getByText("Sales · short by 2 people")).toBeInTheDocument();
	});

	it("names a rule nobody can staff once, with its cause and where to fix it", async () => {
		render(
			<MemoryRouterHarness>
				<ShortShiftsCard
					shortShifts={{
						status: "ready",
						data: {
							unstaffable: [{ rule: staffingRuleFixture(), shortShifts: 14 }],
							gaps: [],
						},
					}}
				/>
			</MemoryRouterHarness>
		);

		expect(
			await screen.findByText("Front desk AM · Front desk")
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Needs 3 a shift of Clerk, Lead; 2 people hold these job titles, so cover cannot fix it. Short on 14 shifts."
			)
		).toBeInTheDocument();
		expect(screen.getAllByRole("listitem")).toHaveLength(1);
		expect(screen.getByRole("link", { name: "Edit rule" })).toHaveAttribute(
			"href",
			"/scheduling?view=constraints&department=d-1"
		);
		expect(
			screen.getByRole("link", { name: "See people in Front desk" })
		).toHaveAttribute("href", "/people?department=d-1");
	});

	it("counts one person who holds the titles as one, and links only where the reader can go", async () => {
		render(
			<MemoryRouterHarness>
				<ShortShiftsCard
					ruleLinks={{ rule: false, people: true }}
					shortShifts={{
						status: "ready",
						data: {
							unstaffable: [
								{
									rule: staffingRuleFixture({
										headcount: 2,
										peopleWithTitles: 1,
									}),
									shortShifts: 1,
								},
							],
							gaps: [],
						},
					}}
				/>
			</MemoryRouterHarness>
		);

		expect(
			await screen.findByText(
				"Needs 2 a shift of Clerk, Lead; 1 person holds these job titles, so cover cannot fix it. Short on 1 shift."
			)
		).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "Edit rule" })).toBeNull();
		expect(
			screen.getByRole("link", { name: "See people in Front desk" })
		).toBeInTheDocument();
	});

	it("says when the read failed, and is left out where rosters may not be read", async () => {
		const { container, rerender } = render(
			<MemoryRouterHarness>
				<ShortShiftsCard shortShifts={{ status: "error" }} />
			</MemoryRouterHarness>
		);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"We couldn’t load the shifts short."
		);

		rerender(
			<MemoryRouterHarness>
				<ShortShiftsCard shortShifts={{ status: "hidden" }} />
			</MemoryRouterHarness>
		);
		expect(container.querySelector("section")).toBeNull();
	});
});
