import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { RosterGrid } from "@/features/scheduling/RosterGrid";
import { rosterFromAssignments } from "@/features/scheduling/roster/roster";
import { daysOf } from "@/features/scheduling/schedules";
import { findingNames } from "@/features/scheduling/roster/findings/findingNames";
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
		).toHaveTextContent("Lunch RushCashier11:00 – 13:00");
		expect(screen.getAllByRole("row")).toHaveLength(4);
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

	it("when_findingsAreGiven_then_marksEachCellRowAndDayThatHasAny", () => {
		const findings = findingsOfEveryKindFixture();
		render(
			<RosterGrid
				days={week}
				rows={rows}
				findings={{
					placed: placeFindings(findings, week),
					names: findingNames(findings, {
						assignments: scheduleAssignmentsFixture(),
						shifts: [],
						constraints: [],
					}),
					onShowAll: vi.fn(),
				}}
			/>
		);

		const ben = screen.getByRole("row", { name: /Ben Ong/ });
		expect(
			within(ben).getByRole("button", { name: "3 notes for Ben Ong" })
		).toHaveTextContent("3");
		expect(
			screen.getByRole("button", { name: "3 notes for Friday, October 16" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "1 note for Saturday, October 17" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", {
				name: "1 note for Chen Wei on Sunday, October 18",
			})
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", {
				name: "Chen Wei, Sun 14:00 – 22:00, 1 note",
			})
		).toBeInTheDocument();
		expect(
			screen.getAllByRole("button", { name: /\bnotes? for\b/ })
		).toHaveLength(4);
	});

	it("when_noFindingsAreGiven_then_marksNothing", () => {
		render(<RosterGrid days={week} rows={rows} />);

		expect(screen.queryByRole("button", { name: /\bnotes? for\b/ })).toBeNull();
	});
});
