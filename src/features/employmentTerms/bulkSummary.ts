import type { TFunction } from "i18next";
import type { BulkOutcome } from "@/features/employmentTerms/api";

const key = "employmentTerms.bulk";

type SkipPhrase =
	| "employmentTerms.bulk.skippedNotFoundOrNoPermission"
	| "employmentTerms.bulk.skippedChangeExists"
	| "employmentTerms.bulk.skippedNotMonday"
	| "employmentTerms.bulk.skippedBeforeFirst"
	| "employmentTerms.bulk.skipped";

/** Why the API skipped someone, as the confirmation words it; any other reason reads as plainly skipped. */
// The API never says whether a member exists or is only out of reach, so one phrase covers both.
const SKIP_PHRASES: Partial<Record<string, SkipPhrase>> = {
	NOT_FOUND_OR_NO_PERMISSION:
		"employmentTerms.bulk.skippedNotFoundOrNoPermission",
	CHANGE_EXISTS: "employmentTerms.bulk.skippedChangeExists",
	DATE_NOT_MONDAY: "employmentTerms.bulk.skippedNotMonday",
	BEFORE_FIRST_ENTRY: "employmentTerms.bulk.skippedBeforeFirst",
};

/**
 * How many were skipped for each reason: the API's `skippedByReason`, or
 * counted from `skipped` when an older API sends no counts. Reasons the app
 * doesn't know read as plainly skipped.
 */
const skipCounts = ({
	skipped,
	skippedByReason,
}: BulkOutcome): Array<[phrase: SkipPhrase, count: number]> => {
	const byReason =
		Object.keys(skippedByReason).length > 0
			? Object.entries(skippedByReason)
			: skipped.map(({ reason }): [string, number] => [reason, 1]);
	const counts = new Map<SkipPhrase, number>();
	for (const [reason, count] of byReason) {
		const phrase = SKIP_PHRASES[reason] ?? "employmentTerms.bulk.skipped";
		counts.set(phrase, (counts.get(phrase) ?? 0) + count);
	}
	return [...counts].filter(([, count]) => count > 0);
};

/**
 * What moving many people did, in one sentence: "Moved 9 people to …, 1
 * already had them, 2 skipped because you can't change their terms, 1
 * skipped because they already have a change on that date."
 */
export const bulkSummary = (
	outcome: BulkOutcome,
	terms: { name: string; date: string },
	t: TFunction
): string =>
	[
		t(`${key}.moved`, { count: outcome.moved, ...terms }),
		...(outcome.unchanged > 0
			? [t(`${key}.unchanged`, { count: outcome.unchanged })]
			: []),
		...skipCounts(outcome).map(([phrase, count]) => t(phrase, { count })),
	].join(", ") + ".";
