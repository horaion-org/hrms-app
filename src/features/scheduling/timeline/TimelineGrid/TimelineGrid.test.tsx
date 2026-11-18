import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import {
	FIXTURE_WEEK,
	timelineRowFixture,
	twoTimelineSchedules,
} from "@/features/scheduling/timeline/fixtures";
import type { TimelineView } from "@/features/scheduling/timeline/timeline";
import { TimelineGrid } from "@/features/scheduling/timeline/TimelineGrid";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

/** Renders Aisha's week in the given view, with `shownScheduleId` alone in full. */
const renderGrid = (
	view: TimelineView,
	shownScheduleId?: string
): Promise<HTMLElement> => {
	render(
		<MemoryRouterHarness>
			<TimelineGrid
				days={FIXTURE_WEEK}
				rows={[timelineRowFixture()]}
				schedules={twoTimelineSchedules()}
				shownScheduleId={shownScheduleId}
				view={view}
				onShowOnly={() => {}}
			/>
		</MemoryRouterHarness>
	);
	return screen.findByRole("row", { name: /Aisha Rahman/ });
};

describe("TimelineGrid", () => {
	it("shows each schedule's shift and No schedule on a day in neither", async () => {
		const row = await renderGrid("week");
		expect(within(row).getAllByText(/Morning/)).toHaveLength(2);
		expect(within(row).getByText("No schedule")).toBeInTheDocument();
	});

	it("dims the cells of other schedules when one is shown alone", async () => {
		const row = await renderGrid("week", "s-late");
		const [early, late] = within(row).getAllByText(/Morning/);
		expect(early!.parentElement).toHaveClass("opacity-40");
		expect(late!.parentElement).not.toHaveClass("opacity-40");
	});

	it("shows a shift's initial in the four-week view", async () => {
		const row = await renderGrid("four");
		expect(within(row).getAllByText("M")).toHaveLength(2);
	});

	/** The Staff cell reads as the roster page's; four weeks keeps only the name and job title. */
	it.each([
		["week", true],
		["four", false],
	] as const)("shows the hours in the %s view: %s", async (view, shown) => {
		const row = await renderGrid(view);
		const staff = within(row).getByRole("rowheader");
		expect(within(staff).getByText("Cook")).toBeInTheDocument();
		expect(within(staff).queryByText("16 hrs") !== null).toBe(shown);
	});
});
