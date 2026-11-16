import type { TFunction } from "i18next";
import dayjs from "dayjs";
import { formatDay } from "@/common/formatDay";
import {
	assignmentCell,
	rosterCellText,
} from "@/features/scheduling/rosterChanges/cellText";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

/*
 * Changed as a timeline, pure: the days changed by hand grouped by the day
 * the change was applied, newest first, each saying whose day, who changed
 * it and when, and what it was and is now.
 */

/** One hand change on the timeline. */
export type ChangeEntry = {
	key: string;
	/** "Aisha Rahman · Mon, 12 Oct": whose day and which. */
	title: string;
	/** "Changed 10:40 by Rosa Lind", or without the name when unknown. */
	byline: string;
	before: string;
	after: string;
};

/** The changes applied on one day, newest first. */
export type ChangeDay = {
	/** The local day the changes were applied, as an ISO date. */
	appliedOn: string;
	/** "Mon, 16 Nov". */
	label: string;
	entries: Array<ChangeEntry>;
};

/** Every changed day, grouped by the local day its change was applied, newest day and change first. */
export const changeTimeline = (
	days: ReadonlyArray<ScheduleAssignment>,
	t: TFunction,
	language: string
): Array<ChangeDay> => {
	const clock = new Intl.DateTimeFormat(language, {
		hour: "2-digit",
		minute: "2-digit",
	});
	const changes = days
		.flatMap((row) => (row.lastChange ? [{ row, change: row.lastChange }] : []))
		.sort((first, second) =>
			second.change.appliedAt.localeCompare(first.change.appliedAt)
		);
	const timeline: Array<ChangeDay> = [];
	for (const { row, change } of changes) {
		const appliedOn = dayjs(change.appliedAt).format("YYYY-MM-DD");
		const time = clock.format(dayjs(change.appliedAt).toDate());
		const name = row.member?.displayName ?? t("scheduling.detail.formerMember");
		const entry: ChangeEntry = {
			key: row.assignmentId,
			title: `${name} · ${formatDay(row.day, language)}`,
			byline: change.appliedBy?.displayName
				? t("scheduling.rosterEdit.changedBy", {
						time,
						name: change.appliedBy.displayName,
					})
				: t("scheduling.rosterEdit.changedAt", { time }),
			before: rosterCellText(change.before, t),
			after: rosterCellText(assignmentCell(row), t),
		};
		const last = timeline.at(-1);
		if (last?.appliedOn === appliedOn) last.entries.push(entry);
		else
			timeline.push({
				appliedOn,
				label: formatDay(appliedOn, language),
				entries: [entry],
			});
	}
	return timeline;
};
