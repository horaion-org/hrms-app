import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { RosterGrid } from "@/features/scheduling/RosterGrid";
import { findingNames } from "@/features/scheduling/roster/findings/findingNames";
import { placeFindings } from "@/features/scheduling/roster/findings/findingsOnGrid";
import { rosterFromAssignments } from "@/features/scheduling/roster/roster";
import { daysOf } from "@/features/scheduling/schedules";
import {
	findingsOfEveryKindFixture,
	scheduleAssignmentsFixture,
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

/** A generated week of Front Office: shifts in their colours, days off and leave. */
export const Default: Story = {};

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
		findings: {
			placed: placeFindings(findings, daysOf("2026-10-12")),
			names: findingNames(findings, {
				assignments: scheduleAssignmentsFixture(),
				shifts: [],
				constraints: [],
			}),
			onShowAll: fn(),
		},
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
	args: { rows: notedRows },
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
