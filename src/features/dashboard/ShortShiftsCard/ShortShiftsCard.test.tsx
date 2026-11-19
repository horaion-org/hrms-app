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
	it("gives each gap one line, its action opening its roster with Find cover on that day", async () => {
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

		const link = await screen.findByRole("link", {
			name: /^Find cover: Morning, /,
		});
		expect(link).toHaveAttribute(
			"href",
			"/scheduling/s-1?week=2026-11-16&day=2026-11-18&cover=fs-am%7C2026-11-18"
		);
		expect(screen.getByRole("listitem")).toHaveTextContent(
			/^Morning · .+ · Sales · short by 2Find cover$/
		);
	});

	it("names a rule nobody can staff once, on one line with its one action", async () => {
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

		const row = await screen.findByRole("listitem");
		expect(row).toHaveTextContent(
			"Front desk AM · needs 3, 2 hold the title · 14 shifts"
		);
		expect(screen.getAllByRole("link")).toHaveLength(1);
		expect(
			screen.getByRole("link", { name: "Edit rule: Front desk AM" })
		).toHaveAttribute("href", "/scheduling?view=constraints&department=d-1");
	});

	it("counts one person who holds the titles as one, and leads to the people where the rule cannot be opened", async () => {
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

		expect(await screen.findByRole("listitem")).toHaveTextContent(
			"Front desk AM · needs 2, 1 holds the title · 1 shift"
		);
		expect(screen.queryByRole("link", { name: /Edit rule/ })).toBeNull();
		expect(
			screen.getByRole("link", { name: "See people in Front desk" })
		).toHaveAttribute("href", "/people?department=d-1");
	});

	it("lists three rows and offers the rest", async () => {
		render(
			<MemoryRouterHarness>
				<ShortShiftsCard
					shortShifts={{
						status: "ready",
						data: {
							unstaffable: [],
							gaps: [
								"2026-11-17",
								"2026-11-18",
								"2026-11-19",
								"2026-11-20",
							].map((day) => shortageFixture({ day })),
						},
					}}
				/>
			</MemoryRouterHarness>
		);

		expect(await screen.findAllByRole("listitem")).toHaveLength(3);
		expect(
			screen.getByRole("button", { name: "Show all 4" })
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
