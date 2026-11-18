import type { RosterShiftCell } from "@/features/scheduling/roster/roster";
import type { TimelineSchedule } from "@/features/scheduling/timeline/timeline";
import type { TimelineRow } from "@/features/scheduling/timeline/timelineRows";

/** The week of Monday 8 February 2027 that the timeline fixtures cover. */
export const FIXTURE_WEEK = [
	"2027-02-08",
	"2027-02-09",
	"2027-02-10",
	"2027-02-11",
	"2027-02-12",
	"2027-02-13",
	"2027-02-14",
];

/** Monday to Wednesday, published, and Friday to Sunday, to review; Thursday has no schedule. */
export const twoTimelineSchedules = (): Array<TimelineSchedule> => [
	{
		id: "s-early",
		name: "Early week",
		firstDay: "2027-02-08",
		lastDay: "2027-02-10",
		status: "PUBLISHED",
	},
	{
		id: "s-late",
		name: "Weekend",
		firstDay: "2027-02-12",
		lastDay: "2027-02-14",
		status: "TO_REVIEW",
	},
];

/** A Morning shift tile from 09:00 to 17:00. */
export const morningShift = (assignmentId: string): RosterShiftCell => ({
	kind: "shift",
	assignmentId,
	shiftId: "sh-morning",
	name: "Morning",
	group: "Kitchen",
	colour: "#3366CC",
	start: "09:00",
	end: "17:00",
	unpaidBreakMinutes: 0,
	carriesOvertime: false,
	role: "Cook",
});

/** Aisha works Monday in the early schedule and Friday in the weekend one. */
export const timelineRowFixture = (): TimelineRow => ({
	key: "m-1",
	name: "Aisha Rahman",
	jobTitle: "Cook",
	days: {
		"2027-02-08": { cell: morningShift("a-1"), scheduleId: "s-early" },
		"2027-02-12": { cell: morningShift("a-2"), scheduleId: "s-late" },
	},
});
