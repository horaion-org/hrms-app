import dayjs from "dayjs";
import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/Icon";
import { dayTypeInSentence } from "@/features/scheduling/dayTypes";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import type { RosterShiftCell } from "@/features/scheduling/roster/roster";
import { paidShiftHours } from "@/features/scheduling/scheduleDraft";

export type ShiftDetailsPanelProps = {
	staffName: string;
	/** A worked day: its frozen shift on `date` (ISO). */
	shift: RosterShiftCell & { date: string };
	onClose: () => void;
	/** What needs a look on the day (`RosterDayNotes`), shown first; nothing without. */
	issues?: ReactNode;
	className?: string;
};

const key = "scheduling.detail.shiftDetails";

/**
 * One worked day beside the roster, read-only: what needs a look on it, who
 * is assigned and on what non-working day type, then its date, time, shift,
 * group and role.
 */
export const ShiftDetailsPanel = ({
	staffName,
	shift,
	onClose,
	issues,
	className,
}: ShiftDetailsPanelProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const titleId = useId();
	const language = formattingLocale(i18n);
	const date = new Intl.DateTimeFormat(language, {
		weekday: "short",
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(dayjs(shift.date).toDate());
	const workedDayType = shift.note?.dayType;
	const details = [
		{ label: t(`${key}.date`), value: date },
		{
			label: t(`${key}.time`),
			value: formatTimeRange({ startTime: shift.start, endTime: shift.end }, t),
		},
		{ label: t(`${key}.shift`), value: shift.name },
		{ label: t(`${key}.group`), value: shift.group },
		{ label: t(`${key}.role`), value: shift.role },
		...(shift.unpaidBreakMinutes > 0
			? [
					{
						label: t(`${key}.unpaidBreak`),
						value: t(`${key}.unpaidBreakValue`, {
							minutes: shift.unpaidBreakMinutes,
						}),
					},
					{
						label: t(`${key}.paidHours`),
						value: t("scheduling.shifts.paidHoursValue", {
							hours: paidShiftHours({
								startTime: shift.start,
								endTime: shift.end,
								unpaidBreakMinutes: shift.unpaidBreakMinutes,
							}),
						}),
					},
				]
			: []),
		...(shift.carriesOvertime
			? [
					{
						label: t(`${key}.carriesOvertime`),
						value: t(`${key}.carriesOvertimeValue`),
					},
				]
			: []),
	];

	return (
		<aside
			aria-labelledby={titleId}
			className={joinClassNames("w-full shrink-0 lg:w-63", className)}
		>
			<div className="overflow-hidden rounded-lg border border-neutral-400 divide-y divide-neutral-400">
				<div className="flex h-14 items-center justify-between px-4">
					<h2 className="font-bold text-neutral-900" id={titleId}>
						{t(`${key}.title`)}
					</h2>
					<Button
						aria-label={t(`${key}.close`)}
						variant="icon"
						onClick={onClose}
					>
						<CloseIcon />
					</Button>
				</div>
				{issues && <div className="px-4 py-4">{issues}</div>}
				<div className="px-4 py-4">
					<div className="flex items-center gap-3">
						<Avatar className="size-10! text-base!" name={staffName} />
						<span className="font-semibold text-neutral-900">{staffName}</span>
					</div>
					<Badge className="mt-5 uppercase" tone="success">
						{t(`${key}.assigned`)}
					</Badge>
					{workedDayType !== undefined && (
						<p className="mt-3 text-sm text-neutral-800">
							{t("scheduling.rosterMarkers.onDayType", {
								dayType: dayTypeInSentence(workedDayType, t),
							})}
						</p>
					)}
				</div>
				<dl className="flex flex-col gap-4 px-4 py-4 text-sm">
					{details.map(({ label, value }) => (
						<div
							key={label}
							className="flex items-center justify-between gap-3"
						>
							<dt className="font-medium text-neutral-800">{label}</dt>
							<dd className="text-right font-semibold text-neutral-900">
								{value}
							</dd>
						</div>
					))}
				</dl>
			</div>
		</aside>
	);
};
