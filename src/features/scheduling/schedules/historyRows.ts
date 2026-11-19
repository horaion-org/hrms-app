import type { TFunction } from "i18next";
import { dateTimeFormatIn } from "@/common/dateTimeFormatIn";
import type { Schedule } from "@/features/scheduling/schedules/api";
import type {
	DeletedSchedule,
	ScheduleDeletion,
} from "@/features/scheduling/schedules/deletedSchedules";

/*
 * History's rows, pure: the live schedules and the deleted ones kept as a
 * record, in one list, and how a deletion is worded.
 */

const key = "scheduling.history.deleted";

/** One row of History: a live schedule, or a deleted one kept as a record. */
export type HistoryRow =
	| { deleted: false; schedule: Schedule }
	| { deleted: true; schedule: DeletedSchedule };

/** When a row last changed: a deleted schedule's deletion, a live one's last update. */
const lastChangedAt = (row: HistoryRow): number =>
	Date.parse(
		row.deleted ? row.schedule.deletion.deletedAt : row.schedule.updatedAt
	) || 0;

/** The live and the deleted schedules as History's rows, the one changed last first. */
export const historyRowsOf = (
	live: ReadonlyArray<Schedule>,
	deleted: ReadonlyArray<DeletedSchedule>
): Array<HistoryRow> =>
	[
		...live.map((schedule): HistoryRow => ({ deleted: false, schedule })),
		...deleted.map((schedule): HistoryRow => ({ deleted: true, schedule })),
	].sort((first, second) => lastChangedAt(second) - lastChangedAt(first));

/** How a deletion is worded: the line's key, and who deleted it when the line names them. */
export type DeletionLine = {
	labelKey: `${typeof key}.${"byLine" | "replacedLine" | "onLine"}`;
	name?: string;
};

/**
 * Which line says how a schedule was deleted: replaced by a later run, deleted
 * by a named manager, or only when. A cause the API did not record names no
 * one, whoever it holds as the deleter: only a manager's delete is said to be theirs.
 */
export const deletionLineOf = ({
	cause,
	deletedByName,
}: ScheduleDeletion): DeletionLine => {
	if (cause === "REPLACED") return { labelKey: `${key}.replacedLine` };
	if (cause === "MANAGER" && deletedByName !== null)
		return { labelKey: `${key}.byLine`, name: deletedByName };
	return { labelKey: `${key}.onLine` };
};

/** The day a schedule was deleted, in its Branch's time zone: "19 Nov 2026". */
export const deletionDate = (
	{ deletion, timeZone }: Pick<DeletedSchedule, "deletion" | "timeZone">,
	language: string
): string =>
	dateTimeFormatIn(language, timeZone, { dateStyle: "medium" }).format(
		new Date(deletion.deletedAt)
	);

/** "Deleted by Rosa Lind on 19 Nov 2026", or the line its deletion calls for. */
export const deletionSentence = (
	schedule: Pick<DeletedSchedule, "deletion" | "timeZone">,
	t: TFunction,
	language: string
): string => {
	const line = deletionLineOf(schedule.deletion);
	return t(line.labelKey, {
		name: line.name,
		date: deletionDate(schedule, language),
	});
};
