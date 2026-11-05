import { linkOptions } from "@tanstack/react-router";
import type { NotificationTarget } from "@/features/notifications/notificationTypes";

/** Where a notification's title links to, as a link's props. */
export type NotificationLink =
	| {
			to: "/leave";
			search: { requestId: string; memberId: string | undefined };
	  }
	| { to: "/scheduling/$scheduleId"; params: { scheduleId: string } }
	| { to: "/settings/data/import-people"; search: { import: string } };

/**
 * The page a notification target opens: the leave request on `/leave`, the
 * schedule's roster, or the people import's result under Settings › Data.
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
			});
		case "import":
			return linkOptions({
				to: "/settings/data/import-people",
				search: { import: target.importId },
			});
	}
};
