import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { dayTypeInSentence } from "@/features/scheduling/dayTypes";
import { formatDay } from "@/features/scheduling/periods";
import {
	leaveLineText,
	leavePortionOf,
} from "@/features/scheduling/roster/roster";
import type { LeaveLinkSearch } from "@/features/scheduling/RosterDayNotes/leaveLinkSearch";
import {
	assignmentCell,
	rosterCellText,
} from "@/features/scheduling/rosterChanges/cellText";
import { leaveTookTheShift } from "@/features/scheduling/rosterChanges/rosterLeave";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

export type CellNowProps = {
	assignment: ScheduleAssignment;
	/** The day reads as leave, or as a day off under approved leave. */
	leaveDay: boolean;
	/** Offers changing every day of the request in Leave; for someone who may change leave here. */
	requestLink: LeaveLinkSearch | undefined;
	/** How many days the request covers. */
	requestDays: number;
	language: string;
};

const key = "scheduling.rosterEdit";

/**
 * What the day holds now: its cell, job title and leave type (with its part
 * of the day for part-day leave, and why the whole day was kept free), the
 * day type a shift falls on, the leave behind a day off, a link to change the
 * whole request in Leave, and who changed the day last, from what, and why.
 */
export const CellNow = ({
	assignment,
	leaveDay,
	requestLink,
	requestDays,
	language,
}: CellNowProps): FunctionComponent => {
	const { t } = useTranslation();
	const lastChange = assignment.lastChange;
	const leavePortion = leavePortionOf(assignment);
	const changedOn = lastChange
		? formatDay(lastChange.appliedAt, language)
		: undefined;

	return (
		<dl className="flex flex-col gap-1 text-sm">
			<dt className="font-medium text-neutral-800">{t(`${key}.now`)}</dt>
			<dd className="font-semibold text-neutral-900">
				{rosterCellText(assignmentCell(assignment), t)}
				{assignment.jobTitle && ` · ${assignment.jobTitle.name}`}
				{assignment.offReason === "LEAVE" &&
					assignment.leaveTypeName &&
					` · ${leaveLineText(assignment.leaveTypeName, leavePortion, t)}`}
			</dd>
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
						<span className="block">{t(`${key}.takenOffForLeave`)}</span>
					)}
					{lastChange.remark && <q className="block">{lastChange.remark}</q>}
				</dd>
			)}
		</dl>
	);
};
