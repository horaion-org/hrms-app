import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import {
	officerWeek,
	partTimerWeek,
	rosterHours,
} from "@/features/scheduling/hours/fixtures";
import { RosterHours } from "@/features/scheduling/hours/RosterHours";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

/** The table's body rows, each as its cells' text. */
const bodyRows = (): Array<Array<string>> =>
	within(screen.getByRole("table", { name: "Hours" }))
		.getAllByRole("row")
		.slice(1)
		.map((row) =>
			within(row)
				.getAllByRole("cell")
				.map((cell) => cell.textContent ?? "")
		);

describe("RosterHours", () => {
	it("lists each person's days worked and hours, then the total", () => {
		render(
			<RosterHours
				assignments={scheduleAssignmentsFixture()}
				hours={{
					status: "ready",
					hours: rosterHours([officerWeek(), partTimerWeek()]),
				}}
			/>
		);

		expect(
			screen.getByRole("heading", { level: 2, name: "Hours" })
		).toBeInTheDocument();
		const rows = bodyRows();
		// The phone summary line sits in the name cell, so only each cell's start is compared.
		expect(rows.map((cells) => cells.slice(1))).toEqual([
			["6", "44 h", "0 h", "28 h"],
			["5", "20 h", "10 h", "0 h"],
			["11", "64 h", "10 h", "28 h"],
		]);
		expect(rows.map((cells) => cells[0])).toEqual([
			expect.stringMatching(/^Aisha Rahman/),
			expect.stringMatching(/^Ben Ong/),
			expect.stringMatching(/^Total/),
		]);
		expect(
			screen.getByText(
				"Planned hours in this roster, by each person’s employment terms that week. Normal: within their contracted hours. Extra: a part-timer’s hours above their contract. Overtime: hours past the normal day or week."
			)
		).toBeInTheDocument();
	});

	it("given_aWeekThatCountsLeave_when_shown_then_aLeaveColumnWithItsFiguresAndTotalAndTheNoteSaysWhatItIs", () => {
		render(
			<RosterHours
				assignments={scheduleAssignmentsFixture()}
				hours={{
					status: "ready",
					hours: rosterHours([
						officerWeek("mp-1", { countedLeaveMinutes: 480 }),
						partTimerWeek(),
					]),
				}}
			/>
		);

		expect(
			within(screen.getByRole("table", { name: "Hours" })).getByRole(
				"columnheader",
				{ name: "Leave" }
			)
		).toBeInTheDocument();
		expect(bodyRows().map((cells) => cells.slice(1))).toEqual([
			["6", "44 h", "0 h", "28 h", "8 h"],
			["5", "20 h", "10 h", "0 h", "0 h"],
			["11", "64 h", "10 h", "28 h", "8 h"],
		]);
		expect(
			screen.getByText(
				/Leave: approved leave that counts towards the week’s hours\.$/
			)
		).toBeInTheDocument();
	});

	it("given_aWeekWithoutCountedLeave_when_shown_then_noLeaveColumnAndTodaysNote", () => {
		render(
			<RosterHours
				assignments={scheduleAssignmentsFixture()}
				hours={{
					status: "ready",
					hours: rosterHours([officerWeek(), partTimerWeek()]),
				}}
			/>
		);

		expect(
			within(screen.getByRole("table", { name: "Hours" })).queryByRole(
				"columnheader",
				{ name: "Leave" }
			)
		).toBeNull();
		expect(screen.queryByText(/approved leave that counts/)).toBeNull();
	});

	it("writes part hours with one decimal at most", () => {
		render(
			<RosterHours
				assignments={scheduleAssignmentsFixture()}
				hours={{
					status: "ready",
					hours: rosterHours([
						officerWeek("mp-1", { normalMinutes: 2250, overtimeMinutes: 20 }),
					]),
				}}
			/>
		);

		expect(bodyRows()[0]?.slice(2)).toEqual(["37.5 h", "0 h", "0.3 h"]);
	});

	it("sets overtime apart in the roster's warning tone, and only when there is some", () => {
		render(
			<RosterHours
				assignments={scheduleAssignmentsFixture()}
				hours={{
					status: "ready",
					hours: rosterHours([officerWeek(), partTimerWeek()]),
				}}
			/>
		);

		const table = screen.getByRole("table", { name: "Hours" });
		const [officer, partTimer] = within(table).getAllByRole("row").slice(1);
		expect(within(officer!).getAllByText("28 h")[0]).toHaveClass(
			"text-warning-900"
		);
		expect(within(partTimer!).getAllByText("0 h")[0]).not.toHaveClass(
			"text-warning-900"
		);
	});

	it("says nobody is rostered when the roster has no one", () => {
		render(
			<RosterHours
				assignments={[]}
				hours={{ status: "ready", hours: rosterHours([]) }}
			/>
		);

		expect(
			screen.getByText("Nobody is rostered this week.")
		).toBeInTheDocument();
	});

	it("says the hours are loading, or couldn't load", () => {
		const { rerender } = render(
			<RosterHours assignments={[]} hours={{ status: "pending" }} />
		);
		expect(screen.getByText("Loading hours…")).toBeInTheDocument();

		rerender(<RosterHours assignments={[]} hours={{ status: "error" }} />);
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Couldn’t load the hours."
		);
	});

	it("shows nothing while the hours are hidden", () => {
		const { container } = render(
			<RosterHours assignments={[]} hours={{ status: "hidden" }} />
		);

		expect(container).toBeEmptyDOMElement();
	});

	it("given_aLaterPart_when_shown_then_saysItCountsTheEarlierDays", () => {
		render(
			<RosterHours
				assignments={scheduleAssignmentsFixture()}
				coveredFrom="2026-12-03"
				hours={{ status: "ready", hours: rosterHours() }}
			/>
		);

		expect(
			screen.getByText(
				"Counts the week from Mon, Nov 30, with the days of the earlier schedule, so weekly overtime matches the roster’s rules."
			)
		).toBeInTheDocument();
	});

	it("given_aWholeWeek_when_shown_then_noLine", () => {
		render(
			<RosterHours
				assignments={scheduleAssignmentsFixture()}
				coveredFrom="2026-11-30"
				hours={{ status: "ready", hours: rosterHours() }}
			/>
		);

		expect(screen.queryByText(/^Counts the week from/)).toBeNull();
	});
});
