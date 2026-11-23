import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type * as Router from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { useState, type ReactElement } from "react";
import { initReactI18next } from "react-i18next";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import en from "@/assets/locales/en/translations.json";
import { GeneratedRoster } from "@/features/scheduling/roster/GeneratedRoster";
import type { RosterEditing } from "@/features/scheduling/roster/GeneratedRoster/rosterEditing";
import { gapAcrossShiftsWeekFixture } from "@/features/scheduling/roster/gapAcrossShiftsFixtures";
import type { RosterSearch } from "@/features/scheduling/roster/rosterSearch";

/*
 * The week of 23 November 2026 as its generation left it: each day a Shift
 * Leader short across Shift B and Shift F, and a Concierge asked "if
 * possible" short, which the engine sends only as a sentence. Issues opened
 * from Monday's header lists Monday's rows as the Issues list draws them.
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

/** Today, for the tests: Monday 23 November 2026, the fixture week's first day. */
const IN_THE_FIXTURE_WEEK = new Date("2026-11-23T09:00:00+08:00");

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"], now: IN_THE_FIXTURE_WEEK });
});

afterEach(() => {
	vi.useRealTimers();
});

vi.mock("@tanstack/react-router", async (importOriginal) => ({
	...(await importOriginal<typeof Router>()),
	Link: ({ children }: { children: React.ReactNode }): React.JSX.Element => (
		<a href="/leave">{children}</a>
	),
}));

const week = gapAcrossShiftsWeekFixture();

/** A manager who may change the roster, which is when Find cover was offered. */
const editing: RosterEditing = {
	target: {
		companyId: "c-1",
		unit: { branchId: "b-1", departmentId: "d-1" },
		scheduleId: "s-1",
		runId: "run-1",
	},
	revision: 0,
	shifts: week.shifts,
	nonWorkingDayTypes: ["OFF", "REST"],
	notifiesMembers: false,
};

/** The week, its view kept as its page keeps it in the URL. */
const Roster = (): ReactElement => {
	const [view, setView] = useState<RosterSearch>({ week: "2026-11-23" });
	return (
		<QueryClientProvider client={new QueryClient()}>
			<GeneratedRoster
				{...week}
				editing={editing}
				view={view}
				onViewChange={setView}
			/>
		</QueryClientProvider>
	);
};

/** The gap's row as the Issues list words it. */
const SHIFT_LEADER_ROW = /1 Shift Leader short/;

describe("GeneratedRoster: Issues opened from a day's header", () => {
	it("given_mondaysHeader_when_chosen_then_listsMondaysRowsAsTheIssuesListDoes", async () => {
		const user = userEvent.setup();
		render(<Roster />);

		await user.click(
			screen.getByRole("button", {
				name: /^Monday, November 23: .* Show in Issues$/,
			})
		);

		const panel = screen.getByRole("complementary", { name: "Issues" });
		expect(
			within(panel).getByRole("button", { name: "Remove Mon, Nov 23" })
		).toBeVisible();
		expect(
			within(panel).getByRole("button", { name: "Clear filters" })
		).toBeVisible();
		expect(within(panel).queryByRole("heading", { name: "Roster" })).toBeNull();
		expect(panel).not.toHaveTextContent("Find cover");
		expect(panel.querySelector("q")).toBeNull();
		expect(panel).not.toHaveTextContent("Tue, Nov 24");

		// One row for the gap, naming both shifts, with its one Cover.
		const coverControls = within(panel).getAllByRole("button", {
			name: /cover/i,
		});
		expect(coverControls).toHaveLength(1);
		expect(coverControls[0]).toHaveAccessibleName(SHIFT_LEADER_ROW);
		expect(coverControls[0]).toHaveTextContent(
			"Mon, Nov 23 · Shift B and Shift F 13:00–02:00"
		);

		// The Concierge line has no facts to word: the list's own row, its sentence as plain text.
		const ifPossible = within(panel).getByRole("button", {
			name: /Asked if possible/,
		});
		expect(ifPossible).toHaveTextContent("Whole roster · Mon, Nov 23");
		await user.click(ifPossible);
		expect(
			within(panel).getByText(
				"If possible, not met: shift Shift B: got 0 of at least 1 employee with role Concierge."
			).tagName
		).toBe("P");
		expect(panel.querySelector("q")).toBeNull();
	});

	it("given_theWholeList_when_shown_then_eachDaysGapNamesBothShifts", async () => {
		const user = userEvent.setup();
		render(<Roster />);

		await user.click(screen.getByRole("button", { name: /^Issues: / }));

		const panel = screen.getByRole("complementary", { name: "Issues" });
		const gapRows = within(panel).getAllByRole("button", {
			name: SHIFT_LEADER_ROW,
		});
		expect(gapRows.map((row) => row.textContent)).toEqual([
			expect.stringContaining("Mon, Nov 23 · Shift B and Shift F 13:00–02:00"),
			expect.stringContaining("Tue, Nov 24 · Shift B and Shift F 13:00–02:00"),
		]);
	});
});
