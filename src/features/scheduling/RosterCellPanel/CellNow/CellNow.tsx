import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { dayTypeInSentence } from "@/features/scheduling/dayTypes";
import { formatDay } from "@/common/formatDay";
import {
	leaveLineText,
	leavePortionOf,
	leavePortionTimeText,
	shiftTimeText,
} from "@/features/scheduling/roster/roster";
import type { LeaveLinkSearch } from "@/features/scheduling/RosterDayNotes/leaveLinkSearch";
import {
	assignmentCell,
	rosterCellText,
} from "@/features/scheduling/rosterChanges/cellText";
import { leaveTookTheShift } from "@/features/scheduling/rosterChanges/rosterLeave";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import type { SchedulePreferenceOutcome } from "@/features/shiftPreferences/api";
import {
	OUTCOME_TONES,
	outcomeLabelKey,
	preferredShiftsText,
	reasonLabelKey,
} from "@/features/shiftPreferences/preferenceOutcome";

export type CellNowProps = {
	assignment: ScheduleAssignment;
	/** The day reads as leave, or as a day off under approved leave. */
	leaveDay: boolean;
	/** Offers changing every day of the request in Leave; for someone who may change leave here. */
	requestLink: LeaveLinkSearch | undefined;
	/** How many days the request covers. */
	requestDays: number;
	language: string;
	/** The member's shift preference on the day and what the roster made of it; no row without. */
	preferenceOutcome?: SchedulePreferenceOutcome;
};

const key = "scheduling.rosterEdit";

/**
 * What the day holds now: its cell (on a shift kept around part-day leave,
 * the time still worked and the leave it is kept around), job title and
 * leave type (with its part of the day for part-day leave, and why the whole
 * day was kept free), the
 * day type a shift falls on, the leave behind a day off, a link to change the
 * whole request in Leave, who changed the day last, from what, and why, and
 * the member's shift preference that day with what the roster made of it.
 */
export const CellNow = ({
	assignment,
	leaveDay,
	requestLink,
	requestDays,
	language,
	preferenceOutcome,
}: CellNowProps): FunctionComponent => {
	const { t } = useTranslation();
	const lastChange = assignment.lastChange;
	const leavePortion = leavePortionOf(assignment);
	const workedTimes = assignment.workedTimes ?? [];
	const keptAroundLeave = assignment.shift !== null && workedTimes.length > 0;
	const changedOn = lastChange
		? formatDay(lastChange.appliedAt, language)
		: undefined;

	return (
		<dl className="flex flex-col gap-1 text-sm">
			<dt className="font-medium text-neutral-800">{t(`${key}.now`)}</dt>
			<dd className="font-semibold text-neutral-900">
				{keptAroundLeave
					? t(`${key}.works`, {
							time: shiftTimeText(
								{
									start: assignment.shift!.startTime,
									end: assignment.shift!.endTime,
									workedTimes,
								},
								t
							),
							shift: assignment.shift!.name,
						})
					: rosterCellText(assignmentCell(assignment), t)}
				{assignment.jobTitle && ` · ${assignment.jobTitle.name}`}
				{assignment.offReason === "LEAVE" &&
					assignment.leaveTypeName &&
					` · ${leaveLineText(assignment.leaveTypeName, leavePortion, t)}`}
			</dd>
			{/* A shift kept around part-day leave names the leave it is kept around. */}
			{keptAroundLeave && assignment.leaveTypeName && leavePortion && (
				<dd className="text-neutral-800">
					{t("scheduling.rosterMarkers.partDayLeave", {
						type: assignment.leaveTypeName,
						time: leavePortionTimeText(leavePortion, t),
					})}
					{requestLink && (
						<>
							{" · "}
							<Button search={requestLink} to="/leave" variant="textlink">
								{t(`${key}.openInLeave`)}
							</Button>
						</>
					)}
				</dd>
			)}
			{/* Part-day leave on a day as generated: the scheduler kept the whole day free. */}
			{assignment.offReason === "LEAVE" && leavePortion && !lastChange && (
				<dd className="text-neutral-800">
					{t(`${key}.partDayKeptFree`, {
						name:
							assignment.member?.displayName ??
							t("scheduling.detail.formerMember"),
					})}
				</dd>
			)}
			{assignment.shift !== null && assignment.dayType !== null && (
				<dd className="text-neutral-800">
					{t("scheduling.rosterMarkers.onDayType", {
						dayType: dayTypeInSentence(assignment.dayType, t),
					})}
				</dd>
			)}
			{leaveDay &&
				assignment.offReason === "OFF" &&
				assignment.leaveTypeName && (
					<dd className="text-neutral-800">
						{t(`${key}.leaveCoversDay`, { type: assignment.leaveTypeName })}
					</dd>
				)}
			{leaveDay && requestLink && (
				<dd>
					<Button search={requestLink} to="/leave" variant="textlink">
						{t(`${key}.changeAllDays`, { count: requestDays })}
					</Button>
				</dd>
			)}
			{lastChange && (
				<dd className="text-neutral-800">
					{lastChange.appliedBy?.displayName
						? t(`${key}.changedBy`, {
								time: changedOn,
								name: lastChange.appliedBy.displayName,
							})
						: t(`${key}.changedAt`, { time: changedOn })}
					<span className="block">
						{t(`${key}.was`, { cell: rosterCellText(lastChange.before, t) })}
					</span>
					{leaveTookTheShift(assignment) && (
						<span className="block">
							{t(
								keptAroundLeave
									? `${key}.shortenedForLeave`
									: `${key}.takenOffForLeave`
							)}
						</span>
					)}
					{lastChange.remark && <q className="block">{lastChange.remark}</q>}
				</dd>
			)}
			{preferenceOutcome && (
				<>
					<dt className="mt-3 font-medium text-neutral-800">
						{t("shiftPreferences.preference")}
					</dt>
					<dd className="flex flex-wrap items-center gap-2 text-neutral-900">
						{t("shiftPreferences.preferred", {
							shifts: preferredShiftsText(
								preferenceOutcome.shiftNames,
								language
							),
						})}
						<Badge
							className="uppercase"
							tone={OUTCOME_TONES[preferenceOutcome.outcome]}
						>
							{t(outcomeLabelKey(preferenceOutcome.outcome))}
						</Badge>
					</dd>
					{preferenceOutcome.reason && (
						<dd className="text-xs text-neutral-800">
							{t(reasonLabelKey(preferenceOutcome.reason))}
						</dd>
					)}
				</>
			)}
		</dl>
	);
};
