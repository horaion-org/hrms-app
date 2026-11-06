import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import type { RosterDayNote } from "@/features/scheduling/roster/roster";
import { leaveLinkSearch } from "./leaveLinkSearch";

export type RosterDayNotesProps = {
	note: RosterDayNote;
	/** The row's member, or `null` once they no longer resolve. */
	membershipId: string | null;
	/** The viewer's own membership: their own leave opens in My leave. */
	viewerMembershipId?: string;
};

const key = "scheduling.rosterMarkers";

/** What the leave records add to a roster day: leave requested or approved, and a shift left short. */
export const RosterDayNotes = ({
	note,
	membershipId,
	viewerMembershipId,
}: RosterDayNotesProps): FunctionComponent => {
	const { t } = useTranslation();
	const leaveText =
		note.flag === "LEAVE_REQUESTED"
			? t(`${key}.leaveRequested`)
			: note.flag === "ON_LEAVE_WHILE_ROSTERED"
				? t(`${key}.onLeave`)
				: undefined;
	const coverText =
		note.uncoveredShiftName === undefined
			? undefined
			: t(`${key}.needsCover`, { shift: note.uncoveredShiftName });
	if (leaveText === undefined && coverText === undefined) return null;
	const leaveTitle = note.leaveTypeName
		? `${leaveText}: ${note.leaveTypeName}`
		: leaveText;
	const search =
		note.leaveRequestId === undefined
			? undefined
			: leaveLinkSearch(note.leaveRequestId, membershipId, viewerMembershipId);
	const leaveBadge = leaveText !== undefined && (
		<Badge compact title={leaveTitle} tone="warning">
			{leaveText}
		</Badge>
	);
	return (
		<span className="mt-1 flex min-w-0 flex-col items-start gap-1">
			{leaveBadge &&
				(search ? (
					<Link
						className="max-w-full rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500"
						search={search}
						to="/leave"
						aria-label={t(`${key}.openInLeave`, {
							status: leaveText,
							type: note.leaveTypeName ?? "",
						})}
					>
						{leaveBadge}
					</Link>
				) : (
					leaveBadge
				))}
			{coverText !== undefined && (
				<Badge compact tone="warning">
					{coverText}
				</Badge>
			)}
		</span>
	);
};
