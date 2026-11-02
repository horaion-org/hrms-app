import dayjs from "dayjs";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import { RosterShift } from "@/features/scheduling/RosterGrid/RosterShift";
import {
	hoursInDays,
	type RosterRow,
	type RosterShiftCell,
} from "@/features/scheduling/roster/roster";
import { rosterLooks } from "@/features/scheduling/rosterLooks";

export type RosterGridProps = {
	/** The seven ISO dates shown, Monday first. */
	days: Array<string>;
	/** One department's members, each with their days. */
	rows: Array<RosterRow>;
	/** The chosen tile's assignment id. */
	selectedShiftId?: string;
	/** A tile was chosen: whose, which day, and its shift. */
	onAssignmentSelect?: (
		row: RosterRow,
		day: string,
		shift: RosterShiftCell
	) => void;
	className?: string;
};

/**
 * Who works when in one week: a row per member and a column per day, each
 * day a shift, a day off or leave.
 */
export const RosterGrid = ({
	days,
	rows,
	selectedShiftId,
	onAssignmentSelect,
	className,
}: RosterGridProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const weekday = new Intl.DateTimeFormat(language, { weekday: "short" });
	const dayMonth = new Intl.DateTimeFormat(language, {
		day: "numeric",
		month: "short",
	});
	/** A day's cell: the shift worked, a day off or leave, or nothing without a row for it. */
	const dayContent = (
		row: RosterRow,
		name: string,
		date: string
	): ReactNode => {
		const cell = row.days[date];
		if (cell === undefined) return null;
		if (cell.kind !== "shift")
			return (
				<span
					className={joinClassNames(
						"flex h-14 items-center justify-center rounded border text-xs font-medium",
						rosterLooks[cell.kind]
					)}
				>
					{t(`scheduling.detail.${cell.kind}`)}
				</span>
			);
		const time = formatTimeRange(
			{ startTime: cell.start, endTime: cell.end },
			t
		);
		return (
			<RosterShift
				selected={cell.assignmentId === selectedShiftId}
				shift={cell}
				timeRange={time}
				label={t("scheduling.detail.shiftLabel", {
					name,
					day: weekday.format(dayjs(date).toDate()),
					time,
				})}
				onSelect={() => {
					onAssignmentSelect?.(row, date, cell);
				}}
			/>
		);
	};

	return (
		<div
			className={joinClassNames(
				"min-w-0 overflow-x-auto rounded-lg border border-neutral-400",
				className
			)}
		>
			<table className="w-full min-w-200 table-fixed border-collapse text-neutral-900">
				<caption className="sr-only">{t("scheduling.detail.roster")}</caption>
				<colgroup>
					<col className="w-50" />
				</colgroup>
				<thead>
					<tr className="bg-neutral-200">
						<th className="h-16 px-3 text-left text-sm font-bold" scope="col">
							{t("scheduling.detail.staff")}
						</th>
						{days.map((date) => (
							<th key={date} className="h-16 px-2 text-center" scope="col">
								<span className="block text-sm font-bold">
									{weekday.format(dayjs(date).toDate())}
								</span>
								<span className="mt-1 block text-xs font-normal">
									{dayMonth.format(dayjs(date).toDate())}
								</span>
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => {
						const name = row.name ?? t("scheduling.detail.formerMember");
						return (
							<tr key={row.key} className="border-t border-neutral-400">
								<th
									className="bg-neutral-50 px-3 py-3 text-left font-normal"
									scope="row"
								>
									<span className="flex items-center gap-3">
										<Avatar className="size-10! text-base!" name={name} />
										<span className="min-w-0">
											<span className="block truncate text-xs font-semibold">
												{name}
											</span>
											<span className="mt-0.5 block truncate text-[0.625rem]">
												{row.jobTitle ?? row.employeeCode}
											</span>
											<span className="block text-[0.625rem]">
												{t("scheduling.detail.hours", {
													count: hoursInDays(row, days),
												})}
											</span>
										</span>
									</span>
								</th>
								{days.map((date) => (
									<td key={date} className="p-3 align-middle">
										{dayContent(row, name, date)}
									</td>
								))}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};
