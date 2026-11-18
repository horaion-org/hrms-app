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
	/** Each zoom level shows only what fits: time over name, the name, or the initial; and its empty-day mark. */
	it.each([
		["week", ["09:00 – 17:00", "Morning"], "No schedule", "Mon", "Feb 8"],
		["two", ["Morning"], "–", "Mon", "8"],
		["four", ["M"], "·", "M", "8"],
	] as const)(
		"shows the %s view's tile, empty day and day header",
		async (view, lines, emptyDay, weekday, date) => {
			const row = await renderGrid(view);
			const [monday] = within(row).getAllByTitle(/Morning/);
			expect(
				[...monday!.querySelectorAll("[aria-hidden]")].map(
					(line) => line.textContent
				)
			).toEqual(lines);
			expect(
				within(row).getByTitle(/Thu, Feb 11: No schedule$/)
			).toHaveTextContent(emptyDay);
			const [, mondayHeader] = screen.getAllByRole("columnheader");
			expect(mondayHeader).toHaveTextContent(`${weekday}${date}`);
		}
	);

	/** A short tile keeps its full words: person, day, shift, schedule and state. */
	it("names each cell in full", async () => {
		const row = await renderGrid("four");
		expect(
			within(row).getByTitle(
				"Aisha Rahman, Fri, Feb 12: Morning 09:00 – 17:00, Weekend, To review"
			)
		).toHaveTextContent("M");
	});

	it("dims the cells of other schedules when one is shown alone", async () => {
		const row = await renderGrid("week", "s-late");
		const [early, late] = within(row).getAllByTitle(/Morning/);
		expect(early).toHaveClass("opacity-40");
		expect(late).not.toHaveClass("opacity-40");
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

	/** Narrow screens scroll the table sideways at each zoom's narrowest day column, keeping the Staff column in view. */
	it("keeps a minimum width per zoom and a sticky Staff column", async () => {
		const row = await renderGrid("two");
		expect(screen.getByRole("table")).toHaveStyle({
			minWidth: "calc(var(--staff-column) + 308px)",
		});
		expect(within(row).getByRole("rowheader")).toHaveClass("sticky", "left-0");
	});

	/** A tile's screen-reader label stays inside its tile, so the table scrolls in its container and never widens the page. */
	it("places every screen-reader label in a positioned tile", async () => {
		const row = await renderGrid("four");
		const labels = row.querySelectorAll(".sr-only");
		expect(labels.length).toBe(7);
		for (const label of labels)
			expect(label.parentElement).toHaveClass("relative");
	});
});
