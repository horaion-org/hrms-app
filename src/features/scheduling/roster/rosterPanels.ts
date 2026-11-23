import type { TFunction } from "i18next";
import type { BadgeTone } from "@/components/ui/Badge";
import { formatDay } from "@/common/formatDay";
import type { RosterRow } from "@/features/scheduling/roster/roster";
import {
	assignmentCell,
	rosterCellText,
} from "@/features/scheduling/rosterChanges/cellText";
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
