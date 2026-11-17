import type { TFunction } from "i18next";
import type { DayRun } from "@/features/scheduling/dates/api";
import type {
	DaysAroundPart,
	PartRedo,
} from "@/features/scheduling/dates/datesSetup";

/** What a part of its week says of the week's other days. */
export type PartLinesSource = {
	/** The days this part covers. */
	covered: DayRun;
	/** The week's days before and after this part (`daysAroundPart`). */
	around: DaysAroundPart;
	/** A redo part touching this one, if any (`partRedoOf`, API ADR-0129). */
	redo: PartRedo | undefined;
};

/**
 * The roster page's lines about a part of its week (API ADR-0113), in order:
 * a redo part touching it, the days before it held by another part, and the
 * days after it, held by another part or still to schedule. None for a
 * schedule covering its whole week with no redo.
 */
export const partLinesOf = (
	{ covered, around, redo }: PartLinesSource,
	formatDays: (days: DayRun) => string,
	t: TFunction
): Array<string> => {
	const lines: Array<string> = [];
	if (redo)
		lines.push(
			t(`scheduling.roster.${redo.kind}`, { days: formatDays(redo.days) })
		);
	if (around.before)
		lines.push(
			t("scheduling.roster.otherPart", { days: formatDays(around.before) })
		);
	if (around.after)
		lines.push(
			around.afterTaken
				? t("scheduling.roster.otherPart", { days: formatDays(around.after) })
				: t("scheduling.roster.coversCallout", {
						covered: formatDays(covered),
						rest: formatDays(around.after),
					})
		);
	return lines;
};
