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
import type { TimelineRow } from "@/features/scheduling/timeline/timelineRows";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

/** Renders Aisha's week (or `row`) in the given view, with `shownScheduleId` alone in full. */
const renderGrid = (
	view: TimelineView,
	shownScheduleId?: string,
	row: TimelineRow = timelineRowFixture()
): Promise<HTMLElement> => {
	render(
		<MemoryRouterHarness>
			<TimelineGrid
				days={FIXTURE_WEEK}
				rosters="loaded"
				rows={[row]}
				schedules={twoTimelineSchedules()}
				shownScheduleId={shownScheduleId}
				view={view}
				statusRow={
					<tr>
						<th scope="row">Status</th>
						<td colSpan={FIXTURE_WEEK.length}>The strip</td>
					</tr>
				}
			/>
		</MemoryRouterHarness>
	);
	return screen.findByRole("row", { name: /Aisha Rahman/ });
};

describe("TimelineGrid", () => {
	/** Each zoom level shows only what fits: time over name, the name, or the initial; and its empty-day mark. */
	it.each([
		["week", ["09:00 – 17:00", "Morning"], "No roster", "Mon", "Feb 8"],
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
				within(row).getByTitle(/Thu, Feb 11: No roster$/)
			).toHaveTextContent(emptyDay);
			const [, mondayHeader] = screen.getAllByRole("columnheader");
			expect(mondayHeader).toHaveTextContent(`${weekday}${date}`);
		}
	);

	/** A short tile keeps its full words: person, day, shift and state; one roster has no schedule to name. */
	it("names each cell in full", async () => {
		const row = await renderGrid("four");
		expect(
			within(row).getByTitle(
				"Aisha Rahman, Fri, Feb 12: Morning 09:00 – 17:00, To review"
			)
		).toHaveTextContent("M");
	});

	it("dims the cells of other schedules when one is shown alone", async () => {
		const row = await renderGrid("week", "s-late");
		const [early, late] = within(row).getAllByTitle(/Morning/);
		expect(early).toHaveClass("opacity-40");
		expect(late).not.toHaveClass("opacity-40");
	});

	/** The status strip's row sits in the table head, under the dates and above the people. */
	it("shows the status row in the head, under the dates", async () => {
		await renderGrid("week");
		const [dates, status] = within(
			screen.getByRole("table").querySelector("thead")!
		).getAllByRole("row");
		expect(within(dates!).getAllByRole("columnheader")).toHaveLength(8);
		expect(status).toHaveTextContent("StatusThe strip");
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

	/** Aisha with a Night shift entered by hand before the weekend run, on Thursday (which no schedule covers) unless `day` says. */
	const renderEnteredDay = (
		view: TimelineView,
		day = "2027-02-11"
	): Promise<HTMLElement> =>
		renderGrid(view, undefined, {
			...timelineRowFixture(),
			entered: {
				[day]: {
					what: { kind: "shift", name: "Night", start: "22:00", end: "06:00" },
					scheduleId: "s-late",
				},
			},
		});

	/** An entered day takes the "No roster" cell's place, dotted and marked "Entered" where the column has room. */
	it.each([
		["week", ["22:00 – 06:00", "Night", "Entered"]],
		["two", ["Night"]],
		["four", ["N"]],
	] as const)(
		"shows a day entered by hand in the %s view",
		async (view, lines) => {
			const row = await renderEnteredDay(view);
			const tile = within(row).getByTitle(
				"Aisha Rahman, Thu, Feb 11: Night 22:00 – 06:00 – entered by hand, not rostered"
			);
			expect(
				[...tile.querySelectorAll("[aria-hidden]")].map(
					(line) => line.textContent
				)
			).toEqual(lines);
			expect(tile).toHaveClass("border-dotted");
			expect(tile).toHaveAttribute("data-entered-for", "s-late");
			expect(within(row).queryByTitle(/No roster$/)).toBeNull();
		}
	);

	/** Tuesday belongs to the early schedule: a day entered there is not shown over it. */
	it("never shows an entered day on a day a schedule covers", async () => {
		const row = await renderEnteredDay("week", "2027-02-09");
		expect(within(row).queryByTitle(/entered by hand/)).toBeNull();
		expect(
			within(row).getByTitle(
				"Aisha Rahman, Tue, Feb 9: not rostered, Published"
			)
		).toBeInTheDocument();
	});

	/** A tile's screen-reader label stays inside its tile, so the table scrolls in its container and never widens the page. */
	it("places every screen-reader label in a positioned tile", async () => {
		const row = await renderGrid("four");
		const labels = row.querySelectorAll(".sr-only");
		expect(labels.length).toBe(7);
		for (const label of labels)
			expect(label.parentElement).toHaveClass("relative");
	});

	/** In Week view the time breaks onto two lines in a narrow column, as the roster page's tile does, never cut short. */
	it("lets the Week view's time wrap instead of cutting it", async () => {
		const row = await renderGrid("week");
		const [monday] = within(row).getAllByTitle(/Morning/);
		const time = within(monday!).getByText("09:00 – 17:00");
		expect(time).toHaveClass("text-balance", "whitespace-normal");
		expect(time).not.toHaveClass("truncate");
		expect(monday).toHaveClass("min-h-12");
	});
});
