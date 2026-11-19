import { scheduleMonthFixture } from "@/features/scheduling/months/fixtures";
import type { RosterShiftCell } from "@/features/scheduling/roster/roster";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { generatedScheduleFixture } from "@/features/scheduling/schedules/fixtures";
import { daysOfRun } from "@/features/scheduling/timeline/rosterStrip";
import type { TimelineSchedule } from "@/features/scheduling/timeline/timeline";
import {
	type TimelinePiece,
	type TimelineRow,
	timelinePiecesOf,
} from "@/features/scheduling/timeline/timelineRows";

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
		publishedOnce: false,
	},
	{
		id: "s-late",
		name: "Weekend",
		firstDay: "2027-02-12",
		lastDay: "2027-02-14",
		status: "TO_REVIEW",
		publishedOnce: false,
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
	employeeCode: null,
	days: {
		"2027-02-08": { cell: morningShift("a-1"), scheduleId: "s-early" },
		"2027-02-12": { cell: morningShift("a-2"), scheduleId: "s-late" },
	},
});

/** The two weeks from Monday 12 October 2026 that the status strip fixtures cover. */
export const FIXTURE_FORTNIGHT = daysOfRun({
	firstDay: "2026-10-12",
	lastDay: "2026-10-25",
});

/** How the strip names each schedule status, as the month read would. */
const STRIP_STATUS: Partial<
	Record<Schedule["status"], TimelineSchedule["status"]>
> = {
	PUBLISHED: "PUBLISHED",
	GENERATED: "TO_REVIEW",
	GENERATION_REQUESTED: "GENERATING",
	GENERATION_FAILED: "FAILED",
	REJECTED: "REJECTED",
	DRAFT: "DRAFT",
};

/**
 * Front Office's fortnight as the status strip takes it: the week of 12
 * October published (s-1), and the week of 19 October (s-2) in
 * `secondWeek`'s status, or with no schedule when left out. October is read.
 */
export const stripFixture = (
	secondWeek?: Schedule["status"]
): {
	schedules: Array<TimelineSchedule>;
	pieces: Record<string, TimelinePiece>;
} => {
	const read = [
		generatedScheduleFixture({ status: "PUBLISHED" }),
		...(secondWeek
			? [
					generatedScheduleFixture({
						scheduleId: "s-2",
						status: secondWeek,
						periodStart: "2026-10-19",
						periodEnd: "2026-10-25",
					}),
				]
			: []),
	];
	return {
		schedules: read.map((schedule) => ({
			id: schedule.scheduleId,
			name: schedule.name,
			firstDay: schedule.coveredFrom,
			lastDay: schedule.coveredTo,
			status: STRIP_STATUS[schedule.status] ?? "UNKNOWN",
			publishedOnce: false,
		})),
		pieces: timelinePiecesOf(read, [
			scheduleMonthFixture({ month: "2026-10", weeks: [] }),
		]),
	};
};
