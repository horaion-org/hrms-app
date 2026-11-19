import type { DateRange } from "@/common/weeks";
import type { WeekState } from "@/features/scheduling/months/api";
import type {
	MyRoster,
	MyRosterDays,
	MyRosterDaysRoster,
} from "@/features/scheduling/myRoster/api";
import { rosterFromAssignments } from "@/features/scheduling/roster/roster";
import type { TimelineSchedule } from "@/features/scheduling/timeline/timeline";
import {
	timelineRowsOf,
	type TimelineRow,
} from "@/features/scheduling/timeline/timelineRows";

/*
 * A member's own view of their departments' published rosters on the
 * timeline grid, without any I/O: the rosters their own read names, each
 * drawn whole from its own read, with the timeline's own row builder.
 */

/** The member's read answers published rosters only, so every roster it names is in this state. */
const PUBLISHED: WeekState = "PUBLISHED";

/** One department's published rosters in the days shown, as the grid takes them. */
export type MemberTimelineGroup = {
	branchName: string;
	departmentName: string;
	schedules: Array<TimelineSchedule>;
	/** One row per person across the department's rosters, the member's own first. */
	rows: Array<TimelineRow>;
};

/** A roster the member's read names, as the timeline places it: by the days it covers. */
export const memberTimelineScheduleOf = (
	roster: MyRosterDaysRoster
): TimelineSchedule => ({
	id: roster.scheduleId,
	name: roster.name,
	firstDay: roster.coveredFrom,
	lastDay: roster.coveredTo,
	// The route answers published rosters only: the state is the contract's, not a guess.
	status: PUBLISHED,
	publishedOnce: true,
});

/** The member's own row first, the others in the order they come; unchanged when the member has no row. */
const ownRowFirst = (
	rows: Array<TimelineRow>,
	ownMembershipId: string | undefined
): Array<TimelineRow> => {
	const own = rows.filter((row) => row.key === ownMembershipId);
	return [...own, ...rows.filter((row) => row.key !== ownMembershipId)];
};

/**
 * The member's departments in the days of `window`, in the order the read
 * names their rosters: each department's rosters merged into one row per
 * person (`timelineRowsOf`), from the whole rosters read so far. A roster not
 * read yet adds its band but no rows. The member's own row is first, known
 * from their own days in the read; with no day of theirs, none is pinned.
 */
export const memberTimelineGroupsOf = (
	answer: MyRosterDays,
	wholeRosters: ReadonlyArray<MyRoster>,
	window: DateRange
): Array<MemberTimelineGroup> => {
	const ownMembershipId = answer.days[0]?.assignment.member?.membershipId;
	const groups = new Map<string, Array<MyRosterDaysRoster>>();
	for (const roster of answer.rosters) {
		const groupKey = `${roster.branchName}\n${roster.departmentName}`;
		groups.set(groupKey, [...(groups.get(groupKey) ?? []), roster]);
	}
	return [...groups.values()].map((rosters) => ({
		branchName: rosters[0]!.branchName,
		departmentName: rosters[0]!.departmentName,
		schedules: rosters.map(memberTimelineScheduleOf),
		rows: ownRowFirst(
			timelineRowsOf(
				rosters.map(({ scheduleId }) => ({
					scheduleId,
					rows: rosterFromAssignments(
						wholeRosters.find((whole) => whole.scheduleId === scheduleId)
							?.assignments ?? [],
						window
					),
				}))
			),
			ownMembershipId
		),
	}));
};
