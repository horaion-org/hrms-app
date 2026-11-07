import dayjs from "dayjs";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";
import { FindingsMarker } from "@/features/scheduling/FindingsMarker";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import { RosterShift } from "@/features/scheduling/RosterGrid/RosterShift";
import type { Finding } from "@/features/scheduling/roster/findings/finding";
import type { FindingNames } from "@/features/scheduling/roster/findings/findingNames";
import type { GridFindings } from "@/features/scheduling/roster/findings/findingsOnGrid";
import {
	hoursInDays,
	type RosterRow,
	type RosterShiftCell,
} from "@/features/scheduling/roster/roster";
import {
	CELL_MARK_TITLE_KEYS,
	cellIssues,
	cellMark,
	showsRole,
	tileStatusKey,
	type CellMark,
} from "@/features/scheduling/roster/rosterMarks";
import { rosterCellKey } from "@/features/scheduling/rosterChanges/rosterEdit";
import { cellMarkLooks, rosterLooks } from "@/features/scheduling/rosterLooks";

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
	/**
	 * Whether a cell's findings and day notes mark it (a dot in the tile);
	 * false on a member's own roster, which marks only their changed days
	 * and reads their own leave in the tile's words.
	 */
	showsIssues?: boolean;
	/**
	 * A day off or leave was chosen; without it those days aren't buttons.
	 * Only someone who may change the roster gets it.
	 */
	onDaySelect?: (row: RosterRow, day: string) => void;
	/** The chosen day off or leave, as `rosterCellKey` names it. */
	selectedDayKey?: string;
	/** Days changed by hand since generation, as `rosterCellKey` names them: marked with a ring unless an issue's dot wins. */
	editedDays?: ReadonlySet<string>;
	/** Days a change being previewed would touch: outlined, dashed. */
	previewDays?: ReadonlySet<string>;
	className?: string;
};

const NO_FINDINGS: ReadonlyArray<Finding> = [];

/** A member's day as `rosterCellKey` names it; none once the member no longer resolves. */
const dayKey = (row: RosterRow, date: string): string | undefined =>
	row.membershipId === null ? undefined : rosterCellKey(row.membershipId, date);

/**
 * Who works when in one week: a row per member and a column per day, each
 * day a shift, a day off or leave. A cell carries its content plus at most
 * one mark in its tile's corner (`cellMark`): a dot when it needs a look,
 * else a ring when it was changed by hand; its words are in the panel the
 * tile opens.
 */
export const RosterGrid = ({
	days,
	rows,
	selectedShiftId,
	onAssignmentSelect,
	findings,
	showsIssues = true,
	onDaySelect,
	selectedDayKey,
	editedDays,
	previewDays,
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
	/** A day's one mark and what its tile's label adds for it: "…, changed, needs a look: 2". */
	const cellMarking = (
		row: RosterRow,
		date: string,
		label: string
	): { mark: CellMark | undefined; label: string } => {
		const key = dayKey(row, date);
		const changed = key !== undefined && editedDays?.has(key) === true;
		const issues = cellIssues(findings?.placed, row, date);
		const named = changed
			? t("scheduling.rosterEdit.edited", { label })
			: label;
		return {
			mark: cellMark({ issues, changed, showsIssues }),
			label:
				showsIssues && issues > 0
					? t("scheduling.findings.marker.tileLabel", {
							label: named,
							count: issues,
						})
					: named,
		};
	};
	/** A day's cell: the shift worked, a day off or leave, or nothing without a row for it. */
	const cellContent = (
		row: RosterRow,
		name: string,
		date: string
	): ReactNode => {
		const cell = row.days[date];
		if (cell === undefined) return null;
		const key = dayKey(row, date);
		if (cell.kind !== "shift") {
			const text =
				(cell.kind === "leave" && cell.leaveTypeName) ||
				t(`scheduling.detail.${cell.kind}`);
			// Read in words, not the tile's capitals: "Aisha Rahman, Sat: Day off".
			const { mark, label } = cellMarking(
				row,
				date,
				t("scheduling.detail.dayLabel", {
					name,
					day: weekday.format(dayjs(date).toDate()),
					kind:
						cell.kind === "leave"
							? (cell.leaveTypeName ?? t("scheduling.rosterEdit.onLeave"))
							: t("scheduling.rosterEdit.dayOff"),
				})
			);
			const looks = joinClassNames(
				"relative flex h-14 w-full items-center justify-center rounded border px-1 text-center text-xs font-medium",
				rosterLooks[cell.kind]
			);
			const markSpot = mark && (
				<span
					aria-hidden="true"
					className={cellMarkLooks[mark]}
					title={t(CELL_MARK_TITLE_KEYS[mark])}
				/>
			);
			if (!onDaySelect || row.membershipId === null)
				return (
					<span className={looks}>
						{markSpot}
						{text}
						{/* The tile is not a button here, so its mark is said in hidden text. */}
						{mark && <span className="sr-only">{label}</span>}
					</span>
				);
			return (
				<button
					aria-label={label}
					aria-pressed={key === selectedDayKey}
					type="button"
					className={joinClassNames(
						looks,
						"cursor-pointer hover:brightness-98 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500",
						key === selectedDayKey && "ring-2 ring-success-600 ring-inset"
					)}
					onClick={() => {
						onDaySelect(row, date);
					}}
				>
					{markSpot}
					{text}
				</button>
			);
		}
		const time = formatTimeRange(
			{ startTime: cell.start, endTime: cell.end },
			t
		);
		const statusKey = tileStatusKey(cell.note, showsIssues);
		const status = statusKey && t(`scheduling.rosterMarkers.${statusKey}`);
		const shiftLabel = t("scheduling.detail.shiftLabel", {
			name,
			day: weekday.format(dayjs(date).toDate()),
			time,
		});
		const { mark, label } = cellMarking(
			row,
			date,
			status
				? t("scheduling.rosterMarkers.tileStatus", {
						label: shiftLabel,
						status,
					})
				: shiftLabel
		);
		return (
			<RosterShift
				label={label}
				mark={mark}
				selected={cell.assignmentId === selectedShiftId}
				shift={cell}
				showsRole={showsRole(cell.role, row.jobTitle)}
				status={status}
				timeRange={time}
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
										</span>
									</span>
								</th>
								{days.map((date) => {
									const key = dayKey(row, date);
									return (
										<td
											key={date}
											className={joinClassNames(
												"p-3 align-middle",
												key !== undefined &&
													previewDays?.has(key) &&
													"outline-2 -outline-offset-4 outline-dashed outline-ink-blue-500"
											)}
										>
											{cellContent(row, name, date)}
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
