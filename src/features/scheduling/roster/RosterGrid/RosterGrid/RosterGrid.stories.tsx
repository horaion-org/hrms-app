import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { daysOf } from "@/common/weeks";
import { RosterGrid } from "@/features/scheduling/roster/RosterGrid";
import { placeFindings } from "@/features/scheduling/roster/findings/findingsOnGrid";
import { rosterFromAssignments } from "@/features/scheduling/roster/roster";
import { daysBeforeByMemberOf } from "@/features/scheduling/roster/weeksBeforeRun";
import {
	findingsOfEveryKindFixture,
	scheduleAssignmentsFixture,
	keptAroundLeaveFixture,
} from "@/features/scheduling/schedules/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/RosterGrid",
	component: RosterGrid,
	parameters: { layout: "padded" },
	args: {
		rows: rosterFromAssignments(scheduleAssignmentsFixture(), {
			start: "2026-10-12",
			end: "2026-10-18",
		}),
		days: daysOf("2026-10-12"),
		onAssignmentSelect: fn(),
	},
} satisfies Meta<typeof RosterGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A generated week of Front Office: shifts in their colours, days off, a rest day, leave and an absent day. */
export const Default: Story = {};

/**
 * Every non-working day in the Off look, named by its type: Aisha's day off
 * and rest day, Ben's absent Sunday, Chen's Friday of a type added later
 * (shown by its code made readable), and Chen's Saturday worked on his rest
 * day.
 */
export const NonWorkingDayTypes: Story = {
	args: {
		rows: rosterFromAssignments(
			scheduleAssignmentsFixture().map((assignment) =>
				assignment.member?.displayName === "Chen Wei" && assignment.off
					? { ...assignment, dayType: "PUBLIC_HOLIDAY_OFF" }
					: assignment
			),
			{ start: "2026-10-12", end: "2026-10-18" }
		),
	},
};

/** Ben's leave days are part-day leave this round: still the whole day, with the time on a second line. */
export const PartDayLeave: Story = {
	args: {
		rows: rosterFromAssignments(
			scheduleAssignmentsFixture().map((assignment) =>
				assignment.offReason === "LEAVE"
					? {
							...assignment,
							leaveTypeName: "Annual leave",
							leaveDurationName: "Morning",
							leaveStartTime: "07:00",
							leaveEndTime: "11:00",
						}
					: assignment
			),
			{ start: "2026-10-12", end: "2026-10-18" }
		),
	},
};

export const ShiftSelected: Story = {
	args: { selectedShiftId: "a-mp-1-2026-10-13" },
};

const findings = findingsOfEveryKindFixture();
const LONG_SHIFT = {
	shiftId: "s-long",
	name: "Front Desk Afternoon",
	group: "Morning",
	colour: "#DC6B47",
	startTime: "14:00",
	endTime: "22:00",
	unpaidBreakMinutes: 0,
	carriesOvertime: false,
};

/** The engine's findings counted on Ben's row, Friday and Saturday, and a dot in Chen's Sunday tile. */
export const WithFindings: Story = {
	args: {
		findings: placeFindings(findings, daysOf("2026-10-12")),
		onShowIssues: fn(),
	},
};

const notedWeek = scheduleAssignmentsFixture().map((assignment, index) => {
	if (index === 1)
		return {
			...assignment,
			flag: "LEAVE_REQUESTED" as const,
			leaveRequestId: "r1",
			leaveTypeName: "Annual leave",
		};
	if (index === 2)
		return {
			...assignment,
			flag: "ON_LEAVE_WHILE_ROSTERED" as const,
			leaveRequestId: "r2",
			leaveTypeName: "Medical",
			uncoveredShift: assignment.shift,
		};
	if (index === 5) return { ...assignment, uncoveredShift: LONG_SHIFT };
	return assignment;
});

const notedRows = rosterFromAssignments(notedWeek, {
	start: "2026-10-12",
	end: "2026-10-18",
});

/** Days the leave records mark (leave requested, on leave, a shift left short): one dot each, the words in the day's panel. */
export const WithDayNotes: Story = {
	args: { rows: notedRows, onShowIssues: fn() },
};

/** Days changed by hand get a hollow ring; on Aisha's Tuesday the dot of the leave requested wins. */
export const WithChangedDays: Story = {
	args: {
		rows: notedRows,
		editedDays: new Set(["m-1|2026-10-12", "m-1|2026-10-13"]),
	},
};

/** A member's own roster: no issue dots, the changed ring, and their own leave in the tile's words. */
export const MembersOwnRoster: Story = {
	args: {
		rows: notedRows,
		showsIssues: false,
		editedDays: new Set(["m-1|2026-10-12"]),
	},
};

/** Beside an open panel: tiles show their time only, in tighter cells, so the week stays in view. */
export const Compact: Story = {
	args: { compact: true, selectedShiftId: "a-mp-1-2026-10-13" },
};

/**
 * Aisha's Monday shortened by morning leave (case a) and her Tuesday worked
 * around leave in the middle (case c), as a leave reader sees them: the time
 * still worked, the leave on the status line, and the issue dot.
 */
export const PartDayShifts: Story = {
	args: {
		showsIssues: true,
		rows: rosterFromAssignments(
			scheduleAssignmentsFixture().map((assignment) => {
				if (assignment.assignmentId === "a-mp-1-2026-10-12")
					return keptAroundLeaveFixture(
						assignment,
						{ start: "09:00", end: "11:00", durationName: "Morning" },
						[{ start: "11:00", end: "15:00" }]
					);
				if (assignment.assignmentId === "a-mp-1-2026-10-13")
					return keptAroundLeaveFixture(
						assignment,
						{ start: "11:00", end: "13:00" },
						[
							{ start: "09:00", end: "11:00" },
							{ start: "13:00", end: "15:00" },
						]
					);
				return assignment;
			}),
			{ start: "2026-10-12", end: "2026-10-18" }
		),
	},
};

/** A part week: the schedule covers Thursday to Sunday; Monday to Wednesday are greyed, not in this schedule. */
export const APartWeek: Story = {
	name: "A part week",
	args: {
		rows: rosterFromAssignments(scheduleAssignmentsFixture(), {
			start: "2026-10-15",
			end: "2026-10-18",
		}),
		outsideDays: ["2026-10-12", "2026-10-13", "2026-10-14"],
	},
};

/**
 * A run starting Thursday: Monday to Wednesday are its days before, muted as
 * a whole and read-only. Aisha's Monday night was entered by hand, her
 * Tuesday comes from an earlier roster, her Wednesday is not known; Ben was
 * on leave on Tuesday.
 */
export const DaysBeforeTheRun: Story = {
	args: {
		rows: rosterFromAssignments(scheduleAssignmentsFixture(), {
			start: "2026-10-15",
			end: "2026-10-18",
		}),
		beforeRunDays: ["2026-10-12", "2026-10-13", "2026-10-14"],
		daysBeforeByMember: daysBeforeByMemberOf([
			{
				memberProfileId: "mp-1",
				date: "2026-10-12",
				what: { kind: "shift", name: "Night", start: "22:00", end: "06:00" },
				enteredByHand: true,
			},
			{
				memberProfileId: "mp-1",
				date: "2026-10-13",
				what: { kind: "off", dayType: "REST" },
				enteredByHand: false,
			},
			{
				memberProfileId: "mp-2",
				date: "2026-10-13",
				what: { kind: "leave" },
				enteredByHand: false,
			},
		]),
	},
};
