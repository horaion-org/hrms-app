import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { FindingList } from "@/features/scheduling/FindingList";
import { FINDING_TONE_ICONS } from "@/features/scheduling/FindingList/findingToneIcons";
import type { Finding } from "@/features/scheduling/roster/findings/finding";
import type { FindingNames } from "@/features/scheduling/roster/findings/findingNames";
import type { RosterDayNote } from "@/features/scheduling/roster/roster";
import {
	dayNoteLines,
	type DayNoteLine,
	type SaidApart,
} from "@/features/scheduling/roster/rosterMarks";
import { leaveLinkSearch } from "./leaveLinkSearch";

export type RosterDayNotesProps = {
	/** What the leave records add to the day; none without. */
	note?: RosterDayNote;
	/** What the engine left on the day, with the names it is shown in. */
	findings?: { list: ReadonlyArray<Finding>; names: FindingNames };
	/** The row's member, or `null` once they no longer resolve. */
	membershipId: string | null;
	/** The viewer's own membership: their own leave opens in My leave. */
	viewerMembershipId?: string;
	/** Lines the day editor already says in its own words, left out here. */
	saidApart?: SaidApart;
};

const key = "scheduling.rosterMarkers";

/**
 * What needs a look on one chosen day, first in its panel beside the grid:
 * what the engine left on it, then what the leave records add (a day to
 * decide, leave requested or taken, with a link to it in Leave, and a shift
 * left short). Each line is led by the outline triangle, as the Issues
 * panel's are. Nothing renders when the day has nothing to say.
 */
export const RosterDayNotes = ({
	note,
	findings,
	membershipId,
	viewerMembershipId,
	saidApart,
}: RosterDayNotesProps): FunctionComponent => {
	const { t } = useTranslation();
	const titleId = useId();
	const lines = dayNoteLines(note, saidApart);
	const found = findings && findings.list.length > 0 ? findings : undefined;
	if (lines.length === 0 && !found) return null;
	const { icon: Icon, colour } = FINDING_TONE_ICONS.warning;

	const lineContent = (line: DayNoteLine): ReactNode => {
		switch (line.kind) {
			case "decision":
				return <p className="text-neutral-800">{t(`${key}.${line.key}`)}</p>;
			case "cover":
				return (
					<p className="text-neutral-800">
						{t(`${key}.needsCover`, { shift: line.shiftName })}
					</p>
				);
			case "leave": {
				const status = t(`${key}.${line.key}`);
				const search =
					line.leaveRequestId === undefined
						? undefined
						: leaveLinkSearch(
								line.leaveRequestId,
								membershipId,
								viewerMembershipId
							);
				return (
					<>
						<p className="text-neutral-800">
							{line.leaveTypeName ? `${status}: ${line.leaveTypeName}` : status}
						</p>
						{search && (
							<Button search={search} to="/leave" variant="textlink">
								{t("scheduling.rosterEdit.reviewInLeave")}
							</Button>
						)}
					</>
				);
			}
		}
	};

	return (
		<section aria-labelledby={titleId} className="flex flex-col gap-3 text-sm">
			<h3 className="font-semibold text-neutral-800" id={titleId}>
				{t(`${key}.needsALook`)}
			</h3>
			{found && <FindingList findings={found.list} names={found.names} />}
			{lines.length > 0 && (
				<ul className="flex flex-col gap-3">
					{lines.map((line) => (
						<li key={line.kind} className="flex gap-2">
							<Icon
								aria-hidden="true"
								className={joinClassNames("mt-0.5 size-4 shrink-0", colour)}
							/>
							<div className="min-w-0">{lineContent(line)}</div>
						</li>
					))}
				</ul>
			)}
		</section>
	);
};
