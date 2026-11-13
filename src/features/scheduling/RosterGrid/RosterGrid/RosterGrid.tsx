import dayjs from "dayjs";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { dayColumnClasses } from "@/common/dayView";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import { RosterHeaderCount } from "@/features/scheduling/RosterGrid/RosterHeaderCount";
import { RosterShift } from "@/features/scheduling/RosterGrid/RosterShift";
import type { GridFindings } from "@/features/scheduling/roster/findings/findingsOnGrid";
import {
	dayWithoutShiftPlainText,
	dayWithoutShiftTileText,
	leavePortionTimeText,
	hoursInDays,
	type RosterRow,
	type RosterShiftCell,
} from "@/features/scheduling/roster/roster";
import {
	CELL_MARK_TITLE_KEYS,
	cellIssues,
	cellMark,
	dayIssueCount,
	rowIssueCount,
	showsRole,
	tileStatus,
	type CellMark,
	type HeaderCount,
	type IssuesAbout,
} from "@/features/scheduling/roster/rosterMarks";
import { rosterCellKey } from "@/features/scheduling/rosterChanges/rosterEdit";
import { cellMarkLooks, rosterLooks } from "@/features/scheduling/rosterLooks";

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
	/** The engine's findings on the days shown, by where they are marked (`placeFindings`); none without. */
	findings?: GridFindings;
	/**
	 * Whether a cell's findings and day notes mark it (a dot in the tile);
	 * false on a member's own roster, which marks only their changed days
	 * and reads their own leave in the tile's words.
	 */
	showsIssues?: boolean;
	/**
	 * A row's or day's header count was chosen: opens the Issues list for it,
	 * giving focus back to `from` when it closes. No header counts without it.
	 */
	onShowIssues?: (about: IssuesAbout, from: HTMLElement) => void;
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
	/**
	 * Days the member is offered a shift on, as `rosterCellKey` names them,
	 * with the deadline's time: said in the tile's label only, never marked.
	 */
	offeredDays?: ReadonlyMap<string, string>;
	/**
	 * A panel is open beside the grid: tiles show their time only, in tighter
	 * cells, so the week stays in view; the panel names the rest.
	 */
	compact?: boolean;
	/**
	 * The one day shown below `md`, where every other day's column hides
	 * (the page's `DaySwitcher` picks it); every day shows when left out.
	 */
	shownDay?: string;
	className?: string;
};

/**
 * The table's least width, so seven days stay readable; from `md` only when
 * a phone shows one day, so that day fits the screen.
 */
const weekWidthClasses = (compact: boolean, oneDay: boolean): string => {
	if (compact) return oneDay ? "md:min-w-160" : "min-w-160";
	return oneDay ? "md:min-w-200" : "min-w-200";
};

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
	onShowIssues,
	onDaySelect,
	selectedDayKey,
	editedDays,
	previewDays,
	offeredDays,
	compact = false,
	shownDay,
	className,
}: RosterGridProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
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
	/** A header's count, or nothing when there is nothing to count or nowhere to show it. */
	const headerCount = (
		count: HeaderCount | undefined,
		about: IssuesAbout,
		label: string
	): ReactNode =>
		showsIssues &&
		onShowIssues &&
		count && (
			<RosterHeaderCount
				count={count}
				label={label}
				onSelect={(from) => {
					onShowIssues(about, from);
				}}
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
		const issues = cellIssues(findings, row, date);
		const offeredBy = key === undefined ? undefined : offeredDays?.get(key);
		const edited = changed
			? t("scheduling.rosterEdit.edited", { label })
			: label;
		const named =
			offeredBy === undefined
				? edited
				: t("scheduling.coverOffers.tileOffered", {
						label: edited,
						time: offeredBy,
					});
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
			const words = dayWithoutShiftTileText(cell, t);
			// Part-day leave still takes the whole day this round; its time goes on a second line.
			const text =
				cell.kind === "leave" && cell.leavePortion ? (
					<span className="flex flex-col">
						<span>{words}</span>
						<span>{leavePortionTimeText(cell.leavePortion, t)}</span>
					</span>
				) : (
					words
				);
			// Read in words, not the tile's capitals: "Aisha Rahman, Sat: Day off".
			const plainLabel = t("scheduling.detail.dayLabel", {
				name,
				day: weekday.format(dayjs(date).toDate()),
				kind: dayWithoutShiftPlainText(cell, t),
			});
			const { mark, label } = cellMarking(row, date, plainLabel);
			const looks = joinClassNames(
				"relative flex w-full items-center justify-center rounded border text-center text-xs font-medium",
				// Beside an open panel, as tall as a compact shift tile, so a row keeps one height.
				compact ? "h-10 px-2.5" : "h-14 px-1",
				// Words kept clear of the mark in the corner, as on a shift tile.
				mark && "pr-3.5",
				// Every non-working day and an absent day share the Off look; leave keeps its own.
				cell.kind === "leave" ? rosterLooks.leave : rosterLooks.off
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
						{(mark || label !== plainLabel) && (
							<span className="sr-only">{label}</span>
						)}
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
		const status = tileStatus(cell.note, showsIssues, t);
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
				compact={compact}
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
			<table
				className={joinClassNames(
					"w-full table-fixed border-collapse text-neutral-900",
					weekWidthClasses(compact, shownDay !== undefined)
				)}
			>
				<caption className="sr-only">{t("scheduling.detail.roster")}</caption>
				<colgroup>
					<col className={compact ? "w-28 sm:w-32" : "w-28 sm:w-50"} />
				</colgroup>
				<thead>
					{/* Below `md` one day shows and its header takes one line: weekday and date side by side. */}
					<tr className="bg-neutral-200">
						{/* The staff column stays in view while the days scroll, as in the availability grid. */}
						<th
							className="sticky left-0 z-10 h-16 bg-neutral-200 px-3 text-left text-sm font-bold max-md:h-11"
							scope="col"
						>
							{t("scheduling.detail.staff")}
						</th>
						{days.map((date) => {
							const count = dayIssueCount(findings, date);
							return (
								<th
									key={date}
									scope="col"
									className={joinClassNames(
										"h-16 px-2 text-center max-md:h-11",
										dayColumnClasses(date, shownDay)
									)}
								>
									<span className="flex items-center justify-center gap-1 text-sm font-bold max-md:inline-flex">
										{weekday.format(dayjs(date).toDate())}
										{headerCount(
											count,
											{ kind: "date", date },
											t("scheduling.findings.marker.date", {
												count: count?.count,
												day: dayName(date),
											})
										)}
									</span>
									<span className="mt-1 block text-xs font-normal max-md:ml-1.5 max-md:inline">
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
						const count = rowIssueCount(findings, row, days);
						return (
							<tr key={row.key} className="border-t border-neutral-400">
								<th
									className="sticky left-0 z-10 bg-neutral-50 px-3 py-3 text-left font-normal"
									scope="row"
								>
									{/* On a phone, or beside an open panel, the row header drops the avatar; the name, job title and hours stay. */}
									<span className="flex items-center gap-3">
										<Avatar
											name={name}
											className={joinClassNames(
												"size-10! text-base!",
												compact ? "hidden!" : "max-sm:hidden"
											)}
										/>
										<span className="min-w-0">
											<span className="flex items-center gap-1">
												<span className="truncate text-xs font-semibold">
													{name}
												</span>
												{row.membershipId !== null &&
													headerCount(
														count,
														{ kind: "member", membershipId: row.membershipId },
														t("scheduling.findings.marker.row", {
															count: count?.count,
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
												"align-middle",
												compact ? "p-1" : "p-3",
												dayColumnClasses(date, shownDay),
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
