import type { TFunction } from "i18next";
import { formatDay } from "@/features/scheduling/periods";
import type { RosterRow } from "@/features/scheduling/roster/roster";
import {
	assignmentCell,
	rosterCellText,
} from "@/features/scheduling/rosterChanges/cellText";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

/** One entry of a side panel list: an optional bold first line, then plain lines. */
export type PanelItem = {
	key: string;
	title?: string;
	lines: ReadonlyArray<string>;
};

/** Each leave marker's copy under `scheduling.rosterMarkers`; a flag left out has no line. */
const LEAVE_MARKERS: Partial<
	Record<NonNullable<ScheduleAssignment["flag"]>, "leaveRequested" | "onLeave">
> = {
	LEAVE_REQUESTED: "leaveRequested",
	ON_LEAVE_WHILE_ROSTERED: "onLeave",
};

/**
 * Each day the roster marks for leave or cover: whose and which day, then
 * what is marked ("Leave requested: Annual leave", "Needs cover: Morning").
 */
export const leaveAndCoverItems = (
	days: ReadonlyArray<ScheduleAssignment>,
	t: TFunction,
	language: string
): Array<PanelItem> =>
	days.map((row) => {
		const markerKey = row.flag ? LEAVE_MARKERS[row.flag] : undefined;
		const marker = markerKey
			? t(`scheduling.rosterMarkers.${markerKey}`)
			: undefined;
		const name = row.member?.displayName ?? t("scheduling.detail.formerMember");
		return {
			key: row.assignmentId,
			title: `${name} · ${formatDay(row.day, language)}`,
			lines: [
				...(marker
					? [row.leaveTypeName ? `${marker}: ${row.leaveTypeName}` : marker]
					: []),
				...(row.uncoveredShift
					? [
							t("scheduling.rosterMarkers.needsCover", {
								shift: row.uncoveredShift.name,
							}),
						]
					: []),
			],
		};
	});

/**
 * Each day a manager must decide: whose and which day, and its marker. A
 * day read without leave access says only that it needs attention.
 */
export const daysToDecideItems = (
	days: ReadonlyArray<ScheduleAssignment>,
	t: TFunction,
	language: string
): Array<PanelItem> =>
	days.map((row) => ({
		key: row.assignmentId,
		title: `${row.member?.displayName ?? t("scheduling.detail.formerMember")} · ${formatDay(row.day, language)}`,
		lines: [
			t(
				row.flag === "NEEDS_ATTENTION"
					? "scheduling.rosterMarkers.needsAttention"
					: "scheduling.rosterMarkers.needsDecision"
			),
		],
	}));

/** "Aisha Rahman: Day 4 of a run" for each member who brought working days into the period. */
export const startingPointItems = (
	rows: ReadonlyArray<RosterRow>,
	startingRuns: ReadonlyMap<string, number> | undefined,
	t: TFunction
): Array<PanelItem> =>
	rows.flatMap((row) => {
		const run =
			row.memberProfileId === undefined
				? undefined
				: startingRuns?.get(row.memberProfileId);
		if (run === undefined) return [];
		const name = row.name ?? t("scheduling.detail.formerMember");
		const dayOfRun = t("scheduling.startingContext.runBadge", {
			count: run + 1,
		});
		return [{ key: row.key, lines: [`${name}: ${dayOfRun}`] }];
	});

/**
 * Each day changed by hand: whose and which day, what it was and what it is
 * now, and who changed it when.
 */
export const changedDayItems = (
	days: ReadonlyArray<ScheduleAssignment>,
	t: TFunction,
	language: string
): Array<PanelItem> =>
	days.flatMap((row) => {
		const change = row.lastChange;
		if (!change) return [];
		const time = formatDay(change.appliedAt, language);
		const name = row.member?.displayName ?? t("scheduling.detail.formerMember");
		return [
			{
				key: row.assignmentId,
				title: `${name} · ${formatDay(row.day, language)}`,
				lines: [
					`${rosterCellText(change.before, t)} → ${rosterCellText(assignmentCell(row), t)}`,
					change.appliedBy?.displayName
						? t("scheduling.rosterEdit.changedBy", {
								time,
								name: change.appliedBy.displayName,
							})
						: t("scheduling.rosterEdit.changedAt", { time }),
				],
			},
		];
	});
