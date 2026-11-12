import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import { FindCoverPanel } from "@/features/scheduling/cover/FindCoverPanel";
import type { RosterEditing } from "@/features/scheduling/GeneratedRoster/rosterEditing";
import { ROSTER_SIDE_LISTS } from "@/features/scheduling/GeneratedRoster/rosterSideLists";
import type { RosterView } from "@/features/scheduling/roster/rosterView";
import { RosterCellPanel } from "@/features/scheduling/RosterCellPanel";
import type { RosterChange } from "@/features/scheduling/rosterChanges/api";
import { RosterDayNotes } from "@/features/scheduling/RosterDayNotes";
import {
	RosterSidePanel,
	type RosterSidePanelSection,
} from "@/features/scheduling/RosterSidePanel";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import { ShiftDetailsPanel } from "@/features/scheduling/ShiftDetailsPanel";

const key = "scheduling.detail";

export type RosterSidePanelSlotProps = {
	/** What opens (`sidePanel`), the chosen day, its notes, the open list and the gap Find cover is for. */
	roster: Pick<
		RosterView,
		| "sidePanel"
		| "chosenRow"
		| "chosenCell"
		| "chosenDayNotes"
		| "openList"
		| "coverGap"
	>;
	assignments: ReadonlyArray<ScheduleAssignment>;
	/** Lets the chosen day be changed; read-only without. */
	editing?: RosterEditing;
	/** The zone the schedule's days and offer deadlines are in. */
	timeZone: string;
	/** The viewer's own membership, which decides where a chosen day's leave request opens. */
	viewerMembershipId?: string;
	/** The open list: its id for `aria-controls`, a key that starts it afresh, and its sections. */
	list: {
		id: string;
		resetKey: string;
		sections: ReadonlyArray<RosterSidePanelSection>;
	};
	onClose: () => void;
	onPreviewDays: (keys: ReadonlyArray<string>) => void;
	/** A hand change went through: the roster says so, and the panel closes. */
	onApplied: (change: RosterChange) => void;
	/** Opens Find cover for a short shift; given only where the roster may be changed. */
	onFindCover?: (gap: CoverGapRequest) => void;
	/** Closes Find cover back to Issues. */
	onCloseCover?: () => void;
};

/**
 * The one panel beside the roster grid: a chosen day's editor (or its shift,
 * read-only), else Find cover for a short shift, else the open list, else
 * nothing. What opens is decided by
 * `sidePanelOf`; the chosen day's notes come first in its panel.
 */
export const RosterSidePanelSlot = ({
	roster: {
		sidePanel,
		chosenRow,
		chosenCell,
		chosenDayNotes,
		openList,
		coverGap,
	},
	assignments,
	editing,
	timeZone,
	viewerMembershipId,
	list,
	onClose,
	onPreviewDays,
	onApplied,
	onFindCover,
	onCloseCover = onClose,
}: RosterSidePanelSlotProps): FunctionComponent => {
	const { t } = useTranslation();
	const shortShift = chosenRow?.uncoveredShift;
	const findCover =
		onFindCover && chosenRow && shortShift
			? (): void => {
					onFindCover({ shiftId: shortShift.shiftId, day: chosenRow.day });
				}
			: undefined;
	const issues = chosenDayNotes && (
		<RosterDayNotes
			{...chosenDayNotes}
			viewerMembershipId={viewerMembershipId}
			onFindCover={editing ? findCover : undefined}
		/>
	);
	if (sidePanel === "dayEditor" && editing && chosenRow)
		return (
			<RosterCellPanel
				// Each day starts with nothing chosen.
				key={chosenRow.assignmentId}
				assignment={chosenRow}
				assignments={assignments}
				issues={issues}
				leaveEditing={editing.leave}
				nonWorkingDayTypes={editing.nonWorkingDayTypes}
				notifiesMembers={editing.notifiesMembers}
				revision={editing.revision}
				shifts={editing.shifts}
				target={editing.target}
				coverOffers={
					editing.coverOffers && {
						offers: editing.coverOffers.offers,
						timeZone,
					}
				}
				onApplied={onApplied}
				onClose={onClose}
				onCoverRecorded={onClose}
				onLeaveChanged={onClose}
				onPreviewDays={onPreviewDays}
			/>
		);
	const coverDayRow =
		coverGap && assignments.find((row) => row.day === coverGap.day);
	if (sidePanel === "cover" && editing && coverGap && coverDayRow)
		return (
			<FindCoverPanel
				// Each gap starts afresh, with the first option chosen.
				key={`${coverGap.shiftId}|${coverGap.day}`}
				assignments={assignments}
				dayRow={coverDayRow}
				gap={coverGap}
				id={list.id}
				revision={editing.revision}
				shifts={editing.shifts}
				target={editing.target}
				coverOffers={
					editing.coverOffers && {
						offers: editing.coverOffers.offers,
						timeZone,
					}
				}
				onClose={onCloseCover}
				onCoverRecorded={onCloseCover}
				onPreviewDays={onPreviewDays}
				onApplied={(change) => {
					onApplied(change);
					onCloseCover();
				}}
			/>
		);
	if (sidePanel === "shiftDetails" && chosenCell?.kind === "shift" && chosenRow)
		return (
			<ShiftDetailsPanel
				issues={issues}
				shift={{ ...chosenCell, date: chosenRow.day }}
				staffName={chosenRow.member?.displayName ?? t(`${key}.formerMember`)}
				onClose={onClose}
			/>
		);
	if (sidePanel === "list" && openList)
		return (
			<RosterSidePanel
				// A new list or filter starts afresh, its heading taking focus.
				key={list.resetKey}
				id={list.id}
				sections={list.sections}
				title={t(ROSTER_SIDE_LISTS[openList].titleKey)}
				onClose={onClose}
			/>
		);
	return null;
};
