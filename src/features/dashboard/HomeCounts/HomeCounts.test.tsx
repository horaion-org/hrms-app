import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { HomeCounts } from "@/features/dashboard/HomeCounts";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("HomeCounts", () => {
	it("names what needs the person in Home's order, each a link to its list", async () => {
		render(
			<MemoryRouterHarness>
				<HomeCounts
					counts={{
						"leave-to-decide": 3,
						"short-shifts": 18,
						"cover-offers": 0,
					}}
				/>
			</MemoryRouterHarness>
		);

		const links = await screen.findAllByRole("link");
		expect(links.map((link) => link.textContent)).toEqual([
			"18 shifts short",
			"3 leave requests to decide",
		]);
		expect(links[0]).toHaveAttribute("href", "/#short-shifts");
	});

	it("leads who is off today to the team's leave timeline", async () => {
		render(
			<MemoryRouterHarness>
				<HomeCounts counts={{ "off-today": 1 }} />
			</MemoryRouterHarness>
		);

		expect(
			await screen.findByRole("link", { name: "1 person off today" })
		).toHaveAttribute("href", "/leave?view=timeline");
	});

	it("says nothing when nothing needs the person", () => {
		const { container } = render(
			<MemoryRouterHarness>
				<HomeCounts counts={{ "short-shifts": 0 }} />
			</MemoryRouterHarness>
		);

		expect(container.querySelector("nav")).toBeNull();
	});
});
