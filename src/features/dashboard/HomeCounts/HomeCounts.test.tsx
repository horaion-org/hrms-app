import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { HomeCounts } from "@/features/dashboard/HomeCounts";
import type { SectionState } from "@/features/dashboard/homeLayout";
import {
	HOME_SECTIONS,
	type HomeSection,
} from "@/features/dashboard/homeSections";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

/** Every section out of reach, but for the ones given. */
const statesOf = (
	known: Partial<Record<HomeSection, SectionState>>
): Record<HomeSection, SectionState> =>
	Object.fromEntries(
		HOME_SECTIONS.map((section) => [section, known[section] ?? "hidden"])
	) as Record<HomeSection, SectionState>;

describe("HomeCounts", () => {
	it("gives each section in reach a tile in Home's order, a number and a few words", async () => {
		render(
			<MemoryRouterHarness>
				<HomeCounts
					counts={{ "leave-to-decide": 3, "short-shifts": 18 }}
					states={statesOf({
						"leave-to-decide": "content",
						"short-shifts": "content",
						"cover-offers": "empty",
					})}
				/>
			</MemoryRouterHarness>
		);

		const tiles = await screen.findAllByRole("listitem");
		expect(tiles.map((tile) => tile.textContent)).toEqual([
			"Shifts18short",
			"Leave3to decide",
			"Cover offers0waiting",
		]);
	});

	it("leads a tile with something to its list, and leaves one at zero in place, quiet and unlinked", async () => {
		render(
			<MemoryRouterHarness>
				<HomeCounts
					counts={{ "short-shifts": 18 }}
					states={statesOf({
						"short-shifts": "content",
						"cover-offers": "empty",
					})}
				/>
			</MemoryRouterHarness>
		);

		const links = await screen.findAllByRole("link");
		expect(links).toHaveLength(1);
		expect(links[0]).toHaveAttribute("href", "/#short-shifts");
		expect(screen.getByText("18")).toHaveClass("text-error-700");
		expect(screen.getByText("0")).toHaveClass("text-neutral-600");
	});

	it("leads who is off today to the team's leave timeline", async () => {
		render(
			<MemoryRouterHarness>
				<HomeCounts
					counts={{ "off-today": 1 }}
					states={statesOf({ "off-today": "content" })}
				/>
			</MemoryRouterHarness>
		);

		expect(
			await screen.findByRole("link", { name: /People.*1.*off today/ })
		).toHaveAttribute("href", "/leave?view=timeline");
	});

	it("shows a dash until a section is known, and no tile for one out of reach", async () => {
		render(
			<MemoryRouterHarness>
				<HomeCounts
					counts={{}}
					states={statesOf({ "next-roster": "pending" })}
				/>
			</MemoryRouterHarness>
		);

		const tiles = await screen.findAllByRole("listitem");
		expect(tiles.map((tile) => tile.textContent)).toEqual(["Rosters–to do"]);
	});

	it("is left out when no section is in reach", () => {
		const { container } = render(
			<MemoryRouterHarness>
				<HomeCounts counts={{}} states={statesOf({})} />
			</MemoryRouterHarness>
		);

		expect(container.querySelector("nav")).toBeNull();
	});
});
