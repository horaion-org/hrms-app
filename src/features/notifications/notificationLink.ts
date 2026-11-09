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
	| {
			to: "/me/schedules/$scheduleId";
			params: { scheduleId: string };
			search: { offer: string };
	  }
	| { to: "/settings/data/import-people"; search: { import: string } }
	| {
			to: "/settings";
			search: { section: "approvals"; subject: "leave" };
	  };

/**
 * The page a notification target opens: the leave request on `/leave`, the
 * schedule's roster on the scheduling page (a day to decide opens its week
 * with the Issues list beside it, an approval with its trail), a
 * rostered member's own view of that roster (with an offer's card when
 * it is about one), the people import's result under Settings › Data, or
 * the leave requests' approval flows under Settings › Approvals.
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
		case "offer":
			return linkOptions({
				to: "/me/schedules/$scheduleId",
				params: { scheduleId: target.scheduleId },
				search: { offer: target.offerId },
			});
		case "import":
			return linkOptions({
				to: "/settings/data/import-people",
				search: { import: target.importId },
			});
		case "leaveApprovalFlows":
			return linkOptions({
				to: "/settings",
				search: { section: "approvals", subject: "leave" },
			});
	}
};
