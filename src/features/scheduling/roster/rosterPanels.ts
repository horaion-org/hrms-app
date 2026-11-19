import type { TFunction } from "i18next";
import type { BadgeTone } from "@/components/ui/Badge";
import { timeRangeText } from "@/features/leave/dayPortion";
import { formatDay } from "@/common/formatDay";
import {
	leaveLineText,
	leavePortionOf,
	type RosterRow,
} from "@/features/scheduling/roster/roster";
import { LEAVE_MARKER_KEYS } from "@/features/scheduling/roster/rosterMarks";
import {
	assignmentCell,
	rosterCellText,
} from "@/features/scheduling/rosterChanges/cellText";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

/** One entry of a side panel list: an optional bold first line, plain lines, then an optional button. */
export type PanelItem = {
	key: string;
	title?: string;
	lines: ReadonlyArray<string>;
	/** A button under the lines, such as Find cover on a shift left short. */
	action?: { label: string; onClick: () => void };
	/** A tag beside the title in its own tone, such as a rule's "If possible". */
	tag?: { label: string; tone: BadgeTone };
};

/**
 * Each day the roster marks for leave or cover: whose and which day, then
 * what is marked ("Leave requested: Annual leave", "Needs cover: Morning",
 * or for part of a shift "Short 09:00–11:00: Aisha Rahman is on leave").
 * With `onFindCover`, a shift left short has a Find cover button.
 */
export const leaveAndCoverItems = (
	days: ReadonlyArray<ScheduleAssignment>,
	t: TFunction,
	language: string,
	onFindCover?: (gap: CoverGapRequest) => void
): Array<PanelItem> =>
	days.map((row) => {
		// A flag without a leave marker has no line.
		const markerKey = row.flag ? LEAVE_MARKER_KEYS[row.flag] : undefined;
		const marker = markerKey
			? t(`scheduling.rosterMarkers.${markerKey}`)
			: undefined;
		const name = row.member?.displayName ?? t("scheduling.detail.formerMember");
		const uncovered = row.uncoveredShift;
		return {
			key: row.assignmentId,
			title: `${name} · ${formatDay(row.day, language)}`,
			lines: [
				...(marker
					? [
							row.leaveTypeName
								? `${marker}: ${leaveLineText(row.leaveTypeName, leavePortionOf(row), t)}`
								: marker,
						]
					: []),
				...(row.uncoveredShift
					? [
							row.uncoveredFrom && row.uncoveredTo
								? t("scheduling.rosterMarkers.partGap", {
										time: timeRangeText(row.uncoveredFrom, row.uncoveredTo, t),
										name,
									})
								: t("scheduling.rosterMarkers.needsCover", {
										shift: row.uncoveredShift.name,
									}),
						]
					: []),
			],
			...(onFindCover && uncovered
				? {
						action: {
							label: t("scheduling.cover.findCover"),
							onClick: (): void => {
								onFindCover({ shiftId: uncovered.shiftId, day: row.day });
							},
						},
					}
				: {}),
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

/** "Aisha Rahman has worked 3 days in a row before this week." for each member who brought working days into the period. */
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
		return [
			{
				key: row.key,
				lines: [t("scheduling.detail.workedInARow", { name, count: run })],
			},
		];
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
