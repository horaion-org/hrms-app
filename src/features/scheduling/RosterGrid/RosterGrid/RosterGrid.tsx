import dayjs from "dayjs";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { FindingsMarker } from "@/features/scheduling/FindingsMarker";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import { RosterShift } from "@/features/scheduling/RosterGrid/RosterShift";
import type { Finding } from "@/features/scheduling/roster/findings/finding";
import type { FindingNames } from "@/features/scheduling/roster/findings/findingNames";
import {
	cellKey,
	type GridFindings,
} from "@/features/scheduling/roster/findings/findingsOnGrid";
import {
	hoursInDays,
	type RosterRow,
	type RosterShiftCell,
} from "@/features/scheduling/roster/roster";
import { rosterLooks } from "@/features/scheduling/rosterLooks";

/** The engine's findings to mark on the week, and the names they are shown with. */
export type RosterGridFindings = {
	placed: GridFindings;
	names: FindingNames;
	/** Opens the findings panel from a marker's popover. */
	onShowAll: () => void;
};

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
	/** Marks findings on cells, rows and days; none without. */
	findings?: RosterGridFindings;
	/** A short note under a member's name, by row key: where they started the week. */
	rowNotes?: ReadonlyMap<string, string>;
	className?: string;
};

const NO_FINDINGS: ReadonlyArray<Finding> = [];

/**
 * Who works when in one week: a row per member and a column per day, each
 * day a shift, a day off or leave.
 */
export const RosterGrid = ({
	days,
	rows,
	selectedShiftId,
	onAssignmentSelect,
	findings,
	rowNotes,
	className,
}: RosterGridProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const weekday = new Intl.DateTimeFormat(language, { weekday: "short" });
	const dayMonth = new Intl.DateTimeFormat(language, {
		day: "numeric",
		month: "short",
	});
	const fullDay = new Intl.DateTimeFormat(language, {
		weekday: "long",
		day: "numeric",
		month: "long",
	});
	const dayName = (date: string): string =>
		fullDay.format(dayjs(date).toDate());
	const cellFindings = (row: RosterRow, date: string): ReadonlyArray<Finding> =>
		(row.membershipId !== null &&
			findings?.placed.byCell.get(cellKey(row.membershipId, date))) ||
		NO_FINDINGS;
	/** A marker for `marked`, or nothing without findings to mark. */
	const marker = (
		marked: ReadonlyArray<Finding>,
		label: string,
		className?: string
	): ReactNode =>
		findings &&
		marked.length > 0 && (
			<FindingsMarker
				className={className}
				findings={marked}
				label={label}
				names={findings.names}
				onShowAll={findings.onShowAll}
			/>
		);
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
		const label = t("scheduling.detail.shiftLabel", {
			name,
			day: weekday.format(dayjs(date).toDate()),
			time,
		});
		const notes = cellFindings(row, date).length;
		return (
			<RosterShift
				selected={cell.assignmentId === selectedShiftId}
				shift={cell}
				timeRange={time}
				label={
					notes > 0
						? t("scheduling.findings.marker.tileLabel", { label, count: notes })
						: label
				}
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
						{days.map((date) => {
							const dayFindings =
								findings?.placed.byDate.get(date) ?? NO_FINDINGS;
							return (
								<th key={date} className="h-16 px-2 text-center" scope="col">
									<span className="flex items-center justify-center gap-1 text-sm font-bold">
										{weekday.format(dayjs(date).toDate())}
										{marker(
											dayFindings,
											t("scheduling.findings.marker.date", {
												count: dayFindings.length,
												day: dayName(date),
											})
										)}
									</span>
									<span className="mt-1 block text-xs font-normal">
										{dayMonth.format(dayjs(date).toDate())}
									</span>
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => {
						const name = row.name ?? t("scheduling.detail.formerMember");
						const rowFindings =
							(row.membershipId !== null &&
								findings?.placed.byRow.get(row.membershipId)) ||
							NO_FINDINGS;
						return (
							<tr key={row.key} className="border-t border-neutral-400">
								<th
									className="bg-neutral-50 px-3 py-3 text-left font-normal"
									scope="row"
								>
									<span className="flex items-center gap-3">
										<Avatar className="size-10! text-base!" name={name} />
										<span className="min-w-0">
											<span className="flex items-center gap-1">
												<span className="truncate text-xs font-semibold">
													{name}
												</span>
												{marker(
													rowFindings,
													t("scheduling.findings.marker.row", {
														count: rowFindings.length,
														name,
													})
												)}
											</span>
											<span className="mt-0.5 block truncate text-[0.625rem]">
												{row.jobTitle ?? row.employeeCode}
											</span>
											<span className="block text-[0.625rem]">
												{t("scheduling.detail.hours", {
													count: hoursInDays(row, days),
												})}
											</span>
											{rowNotes?.has(row.key) && (
												<Badge className="mt-1 text-[0.625rem]! leading-4!">
													{rowNotes.get(row.key) ?? ""}
												</Badge>
											)}
										</span>
									</span>
								</th>
								{days.map((date) => {
									const marked = cellFindings(row, date);
									return (
										<td key={date} className="relative p-3 align-middle">
											{dayContent(row, name, date)}
											{marker(
												marked,
												t("scheduling.findings.marker.cell", {
													count: marked.length,
													name,
													day: dayName(date),
												}),
												"absolute top-0.5 right-0.5"
											)}
										</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};
