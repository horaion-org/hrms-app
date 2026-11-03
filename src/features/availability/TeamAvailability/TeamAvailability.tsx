import { useTranslation } from "react-i18next";
import { WEEKDAYS } from "@/common/weekdays";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import type { MemberWeek } from "@/features/availability/api";
import {
	byDay,
	formatWindow,
	PATTERN_SCOPE,
	weeklyWindowsOf,
	type AvailabilityScope,
} from "@/features/availability/availabilityModel";

export type TeamAvailabilityProps = {
	/** The Branch's part-timers for the week, as the API listed them. */
	members: Array<MemberWeek>;
	/** The week shown, as its Monday. */
	weekStartMonday: string;
	/** Whether the person may change this member's availability, as the workspace says. */
	canEdit: (member: MemberWeek) => boolean;
	/** Opens the editor on the shown week or on the member's default pattern. */
	onEdit: (member: MemberWeek, scope: AvailabilityScope) => void;
};

const key = "availability.team";

/** A day's windows in a cell, one per line, or "—" when there are none. */
const DayWindows = ({
	member,
	dayIndex,
}: {
	member: MemberWeek;
	dayIndex: number;
}): FunctionComponent => {
	const { t } = useTranslation();
	const windows = byDay(weeklyWindowsOf(member.windows))[dayIndex]?.windows;
	if (!windows || windows.length === 0)
		return (
			<>
				<span aria-hidden="true" className="text-neutral-600">
					—
				</span>
				<span className="sr-only">{t("availability.none")}</span>
			</>
		);
	return (
		<>
			{windows.map((window) => (
				<span key={window.startTime} className="block whitespace-nowrap">
					{formatWindow(window)}
				</span>
			))}
		</>
	);
};

/**
 * A Branch's part-timers for one week: a row each, with their Department,
 * the windows of each day Monday first, and "Custom" when the week has
 * hours of its own in place of their pattern. Editing the week or the
 * pattern is offered only on the rows the person may change; the API
 * still checks every change.
 */
export const TeamAvailability = ({
	members,
	weekStartMonday,
	canEdit,
	onEdit,
}: TeamAvailabilityProps): FunctionComponent => {
	const { t } = useTranslation();
	const days: Array<DataTableColumn<MemberWeek>> = WEEKDAYS.map(
		(day, dayIndex) => ({
			id: day,
			header: t(`weekdays.${day}`),
			headerClassName: "min-w-28",
			cell: (member) => <DayWindows dayIndex={dayIndex} member={member} />,
		})
	);
	const columns: Array<DataTableColumn<MemberWeek>> = [
		{
			id: "displayName",
			header: t(`${key}.member`),
			headerClassName: "min-w-48",
			sortValue: (member) => member.displayName,
			cell: (member) => (
				<div className="flex flex-wrap items-center gap-2">
					<span className="font-semibold">{member.displayName}</span>
					{member.source === "OVERRIDE" && (
						<Badge className="text-xs!">{t("availability.custom")}</Badge>
					)}
				</div>
			),
		},
		{
			id: "departmentName",
			header: t(`${key}.department`),
			headerClassName: "min-w-36",
			sortValue: (member) => member.departmentName ?? "",
			cell: (member) => member.departmentName ?? "—",
		},
		...days,
		{
			id: "actions",
			header: t(`${key}.actions`),
			headerClassName: "w-44",
			cell: (member) =>
				canEdit(member) && (
					<div className="flex flex-col items-start gap-1">
						<Button
							aria-label={t(`${key}.editWeekFor`, { name: member.displayName })}
							variant="textlink"
							onClick={() => {
								onEdit(member, { kind: "week", weekStartMonday });
							}}
						>
							{t("availability.editWeek")}
						</Button>
						<Button
							variant="textlink"
							aria-label={t(`${key}.editPatternFor`, {
								name: member.displayName,
							})}
							onClick={() => {
								onEdit(member, PATTERN_SCOPE);
							}}
						>
							{t("availability.editPattern")}
						</Button>
					</div>
				),
		},
	];
	return (
		<DataTable
			className="[&>table]:min-w-300"
			columns={columns}
			data={members}
			defaultSort={{ id: "displayName", desc: false }}
			emptyState={t(`${key}.empty`)}
			getRowId={(member) => member.membershipId}
			label={t(`${key}.label`)}
		/>
	);
};
