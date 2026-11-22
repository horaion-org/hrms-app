import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type * as Router from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { useState, type ReactElement } from "react";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import {
	GeneratedRoster,
	type GeneratedRosterProps,
} from "@/features/scheduling/roster/GeneratedRoster";
import type { RosterSearch } from "@/features/scheduling/roster/rosterSearch";
import type { RosterWeek } from "@/features/scheduling/roster/RosterWeekBar";
import {
	generatedScheduleFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";
import type {
	DayBeforeRun,
	DaysBeforeRunState,
} from "@/features/scheduling/startingContext/daysBeforeRun";

/*
 * Schedule s-1's roster (12–18 October 2026) with the days before its run
 * (28 September – 11 October) beside the Department's month in the bar: a
 * week before the run that a month read lists without a schedule, holding a
 * known day of someone on the roster, is shown here read-only; a week with
 * its own schedule keeps opening it, and a week no read lists is not shown.
 */

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

vi.mock("@tanstack/react-router", async (importOriginal) => ({
	...(await importOriginal<typeof Router>()),
	Link: ({ children }: { children: React.ReactNode }): React.JSX.Element => (
		<a href="/leave">{children}</a>
	),
}));

const schedule = generatedScheduleFixture({ status: "GENERATED" });

/** Aisha's (mp-1) day before the run: a rostered day off, unless entered by hand. */
const aishaOn = (date: string, enteredByHand = false): DayBeforeRun => ({
	memberProfileId: "mp-1",
	date,
	what: enteredByHand
		? { kind: "shift", name: "Night", start: "22:00", end: "06:00" }
		: { kind: "off", dayType: null },
	enteredByHand,
});

const ready = (days: Array<DayBeforeRun>): DaysBeforeRunState => ({
	status: "ready",
	days,
});

/** A month week; choosable when it has a schedule. */
const monthWeek = (
	start: string,
	end: string,
	state: string,
	hasSchedule: boolean
): RosterWeek => ({ start, end, state, disabled: !hasSchedule });

/** October: the week of 5 October without a schedule, then s-1's week. */
const OCTOBER = [
	monthWeek("2026-10-05", "2026-10-11", "Not generated", false),
	monthWeek("2026-10-12", "2026-10-18", "To review", true),
];

/**
 * The roster with its view kept as the page keeps it in the URL, the month's
 * weeks in the bar, and what the month reads list without a schedule: the
 * month's disabled weeks and `monthBeforeFree`, the month before's.
 */
const Roster = ({
	weeks = OCTOBER,
	monthBeforeFree = [],
	firstView = { week: "2026-10-12" },
	onMonthWeek = vi.fn(),
	...props
}: Partial<GeneratedRosterProps> & {
	weeks?: Array<RosterWeek>;
	monthBeforeFree?: Array<string>;
	firstView?: RosterSearch;
	onMonthWeek?: (week: string) => void;
}): ReactElement => {
	const [view, setView] = useState<RosterSearch>(firstView);
	const freeWeeks = weeks.filter((week) => week.disabled);
	return (
		<GeneratedRoster
			assignments={scheduleAssignmentsFixture()}
			departmentWeeks={{ weeks, onWeekChange: onMonthWeek }}
			schedule={schedule}
			view={view}
			monthsBeforeRun={{
				mondaysWithoutSchedule: [
					...freeWeeks.map((week) => week.start),
					...monthBeforeFree,
				],
				reading: false,
			}}
			onViewChange={setView}
			{...props}
		/>
	);
};

const previousWeek = (): HTMLElement =>
	screen.getByRole("button", { name: "Previous week" });
const weekShown = (): HTMLElement =>
	screen.getByRole("button", { name: "Week" });

describe("GeneratedRoster, with the days before its run", () => {
	it("given_aKnownDayInAWeekWithoutASchedule_when_previousIsChosen_then_showsThatWeekHereReadOnly", async () => {
		const user = userEvent.setup();
		const onMonthWeek = vi.fn();
		render(
			<Roster
				daysBefore={ready([aishaOn("2026-10-07", true)])}
				onMonthWeek={onMonthWeek}
			/>
		);

		await user.click(previousWeek());

		expect(onMonthWeek).not.toHaveBeenCalled();
		expect(weekShown()).toHaveTextContent("Before these days");
		const aisha = screen.getByRole("row", { name: /Aisha Rahman/ });
		expect(within(aisha).getByText("Entered")).toBeInTheDocument();
		expect(within(aisha).queryByRole("button")).toBeNull();
		expect(aisha).not.toHaveTextContent(/\d+ hrs?/);
		// The week holds its columns before the run, so the note is gone.
		expect(screen.queryByRole("button", { name: "Show them" })).toBeNull();
		// The week before holds nothing known, so the arrow stops here.
		expect(previousWeek()).toBeDisabled();
	});

	it("given_aWeekWithItsOwnSchedule_when_previousIsChosen_then_opensThatScheduleAndIsNeverReplaced", async () => {
		const user = userEvent.setup();
		const onMonthWeek = vi.fn();
		render(
			<Roster
				daysBefore={ready([aishaOn("2026-10-07", true)])}
				weeks={[
					monthWeek("2026-10-05", "2026-10-11", "Published", true),
					OCTOBER[1]!,
				]}
				onMonthWeek={onMonthWeek}
			/>
		);

		// A keyed-in day in a week with its own schedule is not counted.
		expect(screen.queryByRole("button", { name: "Show them" })).toBeNull();
		await user.click(previousWeek());

		expect(onMonthWeek).toHaveBeenCalledWith("2026-10-05");
		await user.click(weekShown());
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual([
			expect.stringMatching(/· Published$/),
			expect.stringMatching(/· To review$/),
		]);
		expect(screen.queryByText(/Before these days/)).toBeNull();
	});

	it("given_aWeekTheMonthBeforeListsWithoutASchedule_when_itHoldsAKnownDay_then_itIsAddedToTheBar", async () => {
		const user = userEvent.setup();
		render(
			<Roster
				daysBefore={ready([aishaOn("2026-10-02")])}
				monthBeforeFree={["2026-09-28"]}
				weeks={[OCTOBER[1]!]}
			/>
		);

		await user.click(previousWeek());

		expect(weekShown()).toHaveTextContent(
			"Sep 28 – Oct 4, 2026 · Before these days"
		);
	});

	it("given_aWeekNoMonthReadLists_when_itHoldsAKnownDay_then_itIsNotShown", () => {
		render(
			<Roster
				daysBefore={ready([aishaOn("2026-10-02", true)])}
				weeks={[OCTOBER[1]!]}
			/>
		);

		expect(previousWeek()).toBeDisabled();
		expect(screen.queryByRole("button", { name: "Show them" })).toBeNull();
	});

	it("given_theNoteOfEnteredDays_when_showThemIsChosen_then_showsTheNewestWeekHoldingOne", async () => {
		const user = userEvent.setup();
		render(
			<Roster
				monthBeforeFree={["2026-09-28"]}
				daysBefore={ready([
					aishaOn("2026-09-30", true),
					aishaOn("2026-10-07", true),
				])}
			/>
		);

		expect(
			screen.getByText(
				/1 person has shifts entered for the days before these days\./
			)
		).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: "Show them" }));

		expect(weekShown()).toHaveTextContent("Oct 5 – 11, 2026");
	});

	it.each<[string, DaysBeforeRunState | undefined]>([
		["nothing known", ready([])],
		["the read under way", { status: "pending" }],
		["no read at all", undefined],
		[
			"only someone not on the roster known",
			ready([{ ...aishaOn("2026-10-07"), memberProfileId: "mp-other" }]),
		],
	])("given %s, then the bar and the columns are as today", (_, daysBefore) => {
		const part = { ...schedule, coveredFrom: "2026-10-15" };
		render(<Roster daysBefore={daysBefore} schedule={part} />);

		expect(previousWeek()).toBeDisabled();
		expect(screen.queryByText(/Before these days/)).toBeNull();
		const aisha = screen.getByRole("row", { name: /Aisha Rahman/ });
		expect(within(aisha).getAllByText("Not in these days")).toHaveLength(3);
		expect(screen.queryByRole("button", { name: "Show them" })).toBeNull();
	});

	it("given_aPartWithAKnownDayInItsFirstWeek_when_editable_then_theDaysBeforeNeverOpenTheEditor", async () => {
		const user = userEvent.setup();
		const part = { ...schedule, coveredFrom: "2026-10-15" };
		const editing: GeneratedRosterProps["editing"] = {
			target: {
				companyId: "c-1",
				unit: { branchId: "b-1", departmentId: "d-1" },
				scheduleId: "s-1",
				runId: "r-1",
			},
			revision: 1,
			shifts: [],
			nonWorkingDayTypes: [],
			notifiesMembers: false,
		};
		render(
			<QueryClientProvider client={new QueryClient()}>
				<Roster
					daysBefore={ready([aishaOn("2026-10-13")])}
					editing={editing}
					schedule={part}
				/>
			</QueryClientProvider>
		);

		const aisha = screen.getByRole("row", { name: /Aisha Rahman/ });
		const cells = within(aisha).getAllByRole("cell");
		expect(cells[1]).toHaveTextContent("OFF");
		expect(within(cells[0]!).getByText(/not known/)).toHaveClass("sr-only");
		for (const cell of cells.slice(0, 3))
			expect(within(cell).queryByRole("button")).toBeNull();
		await user.click(within(cells[1]!).getByText("OFF"));
		expect(screen.queryByRole("complementary")).toBeNull();
		// The run's own days still open as before.
		expect(within(cells[3]!).getByRole("button")).toBeInTheDocument();
	});
});
