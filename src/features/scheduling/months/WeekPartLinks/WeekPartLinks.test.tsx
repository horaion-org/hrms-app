import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { twoPartWeekFixture } from "@/features/scheduling/months/fixtures";
import { WeekPartLinks } from "@/features/scheduling/months/WeekPartLinks";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

/** Renders the owner's two-part week, with `currentScheduleId` open. */
const renderLinks = async (
	currentScheduleId?: string
): Promise<HTMLElement> => {
	render(
		<MemoryRouterHarness>
			<WeekPartLinks
				currentScheduleId={currentScheduleId}
				departmentId="d-1"
				parts={twoPartWeekFixture()}
			/>
		</MemoryRouterHarness>
	);
	return screen.findByRole("navigation", { name: "Schedules this week" });
};

describe("WeekPartLinks", () => {
	it("given_theFirstPartOpen_when_rendered_then_itIsCurrentAndTheOtherLinksItsRoster", async () => {
		const row = await renderLinks("s-1");

		expect(
			within(row).getByText(/Wed, Feb 17\s?–\s?Fri, Feb 19/)
		).toHaveAttribute("aria-current", "true");
		expect(
			within(row).getByRole("link", { name: /Sat, Feb 20\s?–\s?Sun, Feb 21/ })
		).toHaveAttribute("href", "/scheduling/s-2");
		expect(within(row).getByText("To review")).toBeInTheDocument();
		expect(within(row).getByText("Tentative")).toBeInTheDocument();
	});

	it("given_noneOpen_when_rendered_then_eachPartLinksItsOwnRosterInDayOrder", async () => {
		const row = await renderLinks();

		expect(
			within(row)
				.getAllByRole("link")
				.map((link) => link.getAttribute("href"))
		).toEqual(["/scheduling/s-1", "/scheduling/s-2"]);
	});
});
