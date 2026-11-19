import { useQueries, useQuery } from "@tanstack/react-query";
import type { DateRange } from "@/common/weeks";
import {
	myRosterDaysQuery,
	myRosterQuery,
	type MyRosterDaysRoster,
} from "@/features/scheduling/myRoster/api";
import {
	memberTimelineGroupsOf,
	type MemberTimelineGroup,
} from "@/features/scheduling/timeline/memberTimeline";
import {
	rostersReadOf,
	type RosterReadStep,
	type RostersRead,
} from "@/features/scheduling/timeline/timelineRows";

/** The member's departments in the days shown, once the read naming their rosters has answered. */
export type MemberTimeline =
	| { status: "pending" }
	| { status: "error" }
	| {
			status: "ready";
			/** The published rosters the member is on in the days shown, as their read names them. */
			rosters: Array<MyRosterDaysRoster>;
			groups: Array<MemberTimelineGroup>;
			/** Where the whole rosters' reads stand, for the grid to say. */
			rostersRead: RostersRead;
	  };

/**
 * The member's own published rosters in `window`, each read whole through
 * their own routes: the roster-days read names them, then each roster's own
 * read (`myRosterQuery`) gives every member's row. Needs no scheduling key.
 */
export const useMemberTimeline = (
	companyId: string,
	window: DateRange
): MemberTimeline => {
	const named = useQuery(
		myRosterDaysQuery(companyId, window.start, window.end)
	);
	const wholeReads = useQueries({
		queries: (named.data?.rosters ?? []).map((roster) =>
			myRosterQuery(companyId, roster.scheduleId)
		),
	});
	if (named.isPending) return { status: "pending" };
	if (named.isError) return { status: "error" };
	const steps = wholeReads.map((read): RosterReadStep => {
		if (read.isError) return "failed";
		return read.isPending ? "pending" : "done";
	});
	return {
		status: "ready",
		rosters: named.data.rosters,
		groups: memberTimelineGroupsOf(
			named.data,
			wholeReads.flatMap((read) => (read.data ? [read.data] : [])),
			window
		),
		rostersRead: rostersReadOf(steps),
	};
};
