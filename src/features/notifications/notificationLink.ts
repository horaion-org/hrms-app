import { linkOptions } from "@tanstack/react-router";
import type { NotificationTarget } from "@/features/notifications/notificationTypes";
import type { RosterSearch } from "@/features/scheduling/roster/rosterSearch";
import { mondayOf } from "@/features/scheduling/schedules";

/** Where a notification's title links to, as a link's props. */
export type NotificationLink =
	| {
			to: "/leave";
			search: { requestId: string; memberId: string | undefined };
	  }
	| {
			to: "/scheduling/$scheduleId";
			params: { scheduleId: string };
			search: RosterSearch;
	  }
	| { to: "/me/schedules/$scheduleId"; params: { scheduleId: string } }
	| { to: "/settings/data/import-people"; search: { import: string } };

/**
 * The page a notification target opens: the leave request on `/leave`, the
 * schedule's roster on the scheduling page (a day to decide opens its week
 * with the Issues list beside it, an approval with its trail), a
 * rostered member's own view of
 * that roster, or the people import's result under Settings › Data.
 */
export const notificationLink = (
	target: NotificationTarget
): NotificationLink => {
	switch (target.kind) {
		case "leave":
			return linkOptions({
				to: "/leave",
				search: { requestId: target.requestId, memberId: target.memberId },
			});
		case "schedule":
			return linkOptions({
				to: "/scheduling/$scheduleId",
				params: { scheduleId: target.scheduleId },
				search: target.day
					? { week: mondayOf(target.day), panel: "issues" }
					: {},
			});
		case "approval":
			return linkOptions({
				to: "/scheduling/$scheduleId",
				params: { scheduleId: target.scheduleId },
				search: { panel: "approval" },
			});
		case "myRoster":
			return linkOptions({
				to: "/me/schedules/$scheduleId",
				params: { scheduleId: target.scheduleId },
			});
		case "import":
			return linkOptions({
				to: "/settings/data/import-people",
				search: { import: target.importId },
			});
	}
};
