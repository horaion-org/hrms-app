import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { RosterGrid } from "@/features/scheduling/RosterGrid";
import { rosterFromAssignments } from "@/features/scheduling/roster/roster";
import { daysOf } from "@/features/scheduling/schedules";
import { placeFindings } from "@/features/scheduling/roster/findings/findingsOnGrid";
import {
	findingsOfEveryKindFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("RosterGrid", () => {
	const week = daysOf("2026-10-12");
	const rows = rosterFromAssignments(scheduleAssignmentsFixture(), {
		start: "2026-10-12",
		end: "2026-10-18",
	});

	it("when_rendered_then_showsEachMembersShiftsDaysOffAndLeave", () => {
		render(<RosterGrid days={week} rows={rows} />);

		expect(screen.queryByRole("button", { name: /Collapse/ })).toBeNull();
		const ben = screen.getByRole("row", { name: /Ben Ong/ });
		expect(within(ben).getAllByRole("button")).toHaveLength(4);
		expect(within(ben).getAllByText("LEAVE")).toHaveLength(2);
		expect(within(ben).getAllByText("OFF")).toHaveLength(1);
		expect(ben).toHaveTextContent("Front Desk Staff");
		expect(ben).toHaveTextContent("16 hrs");
		expect(
			within(ben).getByRole("button", {
				name: "Ben Ong, Fri 11:00 – 13:00",
			})
		).toHaveTextContent("11:00 – 13:00Lunch RushCashier");
		expect(screen.getAllByRole("row")).toHaveLength(4);
	});

	it("given_aShiftWorkedAsTheMembersOwnJobTitle_when_rendered_then_leavesOutTheRepeatedRole", () => {
		render(<RosterGrid days={week} rows={rows} />);

		expect(
			screen.getByRole("button", { name: "Aisha Rahman, Mon 09:00 – 15:00" })
		).toHaveTextContent(/^09:00 – 15:00Front Desk AM$/);
		expect(
			screen.getByRole("button", { name: "Ben Ong, Fri 11:00 – 13:00" })
		).toHaveTextContent(/Cashier$/);
	});

	it("given_leaveNamedByItsType_when_rendered_then_showsTheTypeInsteadOfLeave", () => {
		const named = rosterFromAssignments(
			scheduleAssignmentsFixture().map((assignment) =>
				assignment.offReason === "LEAVE"
					? { ...assignment, leaveTypeName: "Sick leave" }
					: assignment
			),
			{ start: "2026-10-12", end: "2026-10-18" }
		);

		render(<RosterGrid days={week} rows={named} />);

		const ben = screen.getByRole("row", { name: /Ben Ong/ });
		expect(within(ben).getAllByText("Sick leave")).toHaveLength(2);
		expect(within(ben).queryByText("LEAVE")).toBeNull();
		expect(within(ben).getAllByText("OFF")).toHaveLength(1);
	});

	it("when_aTileIsChosen_then_reportsTheMemberDayAndShift", async () => {
		const user = userEvent.setup();
		const onAssignmentSelect = vi.fn();
		render(
			<RosterGrid
				days={week}
				rows={rows}
				selectedShiftId="a-mp-1-2026-10-13"
				onAssignmentSelect={onAssignmentSelect}
			/>
		);

		expect(
			screen.getByRole("button", { name: "Aisha Rahman, Tue 09:00 – 15:00" })
		).toHaveAttribute("aria-pressed", "true");
		await user.click(
			screen.getByRole("button", { name: "Chen Wei, Mon 14:00 – 22:00" })
		);

		expect(onAssignmentSelect).toHaveBeenCalledWith(
			expect.objectContaining({ key: "m-3" }),
			"2026-10-12",
			expect.objectContaining({ assignmentId: "a-mp-3-2026-10-12" })
		);
	});

	it("when_aMemberIsGone_then_namesThemAFormerMember", () => {
		render(
			<RosterGrid
				days={week}
				rows={[{ ...rows[0]!, name: null, jobTitle: null }]}
			/>
		);

		const row = screen.getByRole("row", { name: /Former member/ });
		expect(row).toHaveTextContent("EMP-001");
	});

	it("when_findingsAreGiven_then_countsEachRowAndDayAndDotsTheCellInItsTile", async () => {
		const user = userEvent.setup();
		const onShowIssues = vi.fn();
		render(
			<RosterGrid
				days={week}
				findings={placeFindings(findingsOfEveryKindFixture(), week)}
				rows={rows}
				onShowIssues={onShowIssues}
			/>
		);

		const ben = screen.getByRole("row", { name: /Ben Ong/ });
		expect(
			within(ben).getByRole("button", {
				name: "Ben Ong: 3 to look at. Show in Issues",
			})
		).toHaveTextContent("3");
		// Chen's row counts the issue on his Sunday.
		expect(
			screen.getByRole("button", {
				name: "Chen Wei: 1 to look at. Show in Issues",
			})
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", {
				name: "Friday, October 16: 3 to look at. Show in Issues",
			})
		).toBeInTheDocument();
		const saturday = screen.getByRole("button", {
			name: "Saturday, October 17: 1 to look at. Show in Issues",
		});
		await user.click(saturday);
		expect(onShowIssues).toHaveBeenCalledWith(
			{ kind: "date", date: "2026-10-17" },
			saturday
		);
		const chensSunday = screen.getByRole("button", {
			name: "Chen Wei, Sun 14:00 – 22:00, needs a look: 1",
		});
		expect(chensSunday.querySelector("[aria-hidden='true']")).toHaveClass(
			"bg-warning-900"
		);
		// The cell's words open with the tile; it has no count of its own.
		expect(screen.getAllByRole("button", { name: /to look at/ })).toHaveLength(
			4
		);
	});

	it("given_aDayChangedByHand_when_rendered_then_ringsItUnlessAnIssuesDotWins", () => {
		const findings = findingsOfEveryKindFixture();
		render(
			<RosterGrid
				days={week}
				editedDays={new Set(["m-1|2026-10-12", "m-3|2026-10-18"])}
				findings={placeFindings(findings, week)}
				rows={rows}
			/>
		);

		const changed = screen.getByRole("button", {
			name: "Aisha Rahman, Mon 09:00 – 15:00, changed",
		});
		expect(changed.querySelector("[aria-hidden='true']")).toHaveClass(
			"ring-ink-blue-700"
		);
		const both = screen.getByRole("button", {
			name: "Chen Wei, Sun 14:00 – 22:00, changed, needs a look: 1",
		});
		expect(both.querySelectorAll("[aria-hidden='true']")).toHaveLength(1);
		expect(both.querySelector("[aria-hidden='true']")).toHaveClass(
			"bg-warning-900"
		);
	});

	it("given_aMembersOwnRoster_when_theirLeaveIsRequested_then_saysItInTheTileWithNoDot", () => {
		const own = rosterFromAssignments(
			scheduleAssignmentsFixture().map((assignment) =>
				assignment.assignmentId === "a-mp-1-2026-10-13"
					? { ...assignment, flag: "LEAVE_REQUESTED" as const }
					: assignment
			),
			{ start: "2026-10-12", end: "2026-10-18" }
		);

		render(<RosterGrid days={week} rows={own} showsIssues={false} />);

		const tile = screen.getByRole("button", {
			name: "Aisha Rahman, Tue 09:00 – 15:00, Leave requested",
		});
		expect(tile).toHaveTextContent(/Leave requested$/);
		expect(tile.querySelector("[aria-hidden='true']")).toBeNull();
	});

	it("when_noFindingsAreGiven_then_marksNothing", () => {
		render(<RosterGrid days={week} rows={rows} onShowIssues={vi.fn()} />);

		expect(screen.queryByRole("button", { name: /to look at/ })).toBeNull();
	});

	it("given_aMembersOwnRoster_when_findingsAreGiven_then_countsNothing", () => {
		render(
			<RosterGrid
				days={week}
				findings={placeFindings(findingsOfEveryKindFixture(), week)}
				rows={rows}
				showsIssues={false}
				onShowIssues={vi.fn()}
			/>
		);

		expect(screen.queryByRole("button", { name: /to look at/ })).toBeNull();
		expect(
			screen.getByRole("button", { name: "Chen Wei, Sun 14:00 – 22:00" })
		).toBeInTheDocument();
	});

	it("given_aDayNote_when_rendered_then_dotsTheTileAndLeavesTheWordsToItsPanel", () => {
		const noted = scheduleAssignmentsFixture().map((assignment, index) =>
			index === 0
				? {
						...assignment,
						uncoveredShift: {
							shiftId: "s1",
							name: "Morning",
							group: "Day",
							colour: "#112233",
							startTime: "09:00",
							endTime: "17:00",
							unpaidBreakMinutes: 0,
							carriesOvertime: false,
						},
					}
				: assignment
		);

		render(
			<RosterGrid
				days={daysOf("2026-10-12")}
				rows={rosterFromAssignments(noted, {
					start: "2026-10-12",
					end: "2026-10-18",
				})}
				onAssignmentSelect={vi.fn()}
			/>
		);

		expect(screen.queryByText("Needs cover: Morning")).toBeNull();
		expect(
			screen.getByRole("button", {
				name: "Aisha Rahman, Mon 09:00 – 15:00, needs a look: 1",
			})
		).toBeInTheDocument();
	});

	it("given_anOpenPanel_when_compact_then_tilesShowTheTimeOnlyAtOneHeight", () => {
		render(<RosterGrid compact days={week} rows={rows} />);

		const ben = screen.getByRole("row", { name: /Ben Ong/ });
		expect(
			within(ben).getByRole("button", { name: "Ben Ong, Fri 11:00 – 13:00" })
		).toHaveTextContent(/^11:00 – 13:00$/);
		for (const tile of within(ben).getAllByText(/^(OFF|LEAVE)$/))
			expect(tile).toHaveClass("h-10");
	});

	it("when_theDaysScroll_then_theStaffColumnStaysPinned", () => {
		render(<RosterGrid days={week} rows={rows} />);

		expect(screen.getByRole("columnheader", { name: "Staff" })).toHaveClass(
			"sticky",
			"left-0"
		);
		expect(screen.getByRole("rowheader", { name: /Ben Ong/ })).toHaveClass(
			"sticky",
			"left-0"
		);
	});
});
