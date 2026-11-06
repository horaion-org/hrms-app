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
