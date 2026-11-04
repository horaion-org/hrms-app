import { Link } from "@tanstack/react-router";
import type { FunctionComponent } from "@/common/types";
import type { Activity } from "@/features/organisation/activity";

const linkClassName =
	"underline-offset-4 hover:text-ink-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500";

/** An activity's title, linked to its entity's page when the app has one. */
export const ActivityTitle = ({
	activity,
}: {
	activity: Activity;
}): FunctionComponent => {
	const { link, title } = activity;
	switch (link?.kind) {
		case "accessRole":
			return (
				<Link
					className={linkClassName}
					params={{ accessRoleId: link.accessRoleId }}
					to="/organisation/system-roles/$accessRoleId"
				>
					{title}
				</Link>
			);
		case "member":
			return (
				<Link
					className={linkClassName}
					params={{ membershipId: link.membershipId }}
					to="/people/$membershipId"
				>
					{title}
				</Link>
			);
		case undefined:
			return <>{title}</>;
	}
};
