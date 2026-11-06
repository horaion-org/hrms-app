import type { ParseKeys } from "i18next";
import type { RosterCheck } from "@/features/scheduling/rosterChanges/api";

/** How a check's people, shifts and days are named on screen. */
export type CheckNames = {
	/** A member's name by membership id. */
	member: (membershipId: string | null) => string;
	/** A frozen shift's name by its id. */
	shift: (shiftId: string | null) => string;
	/** A day, e.g. "Sat 17 Oct". */
	day: (isoDate: string) => string;
};

/** A check as a translation key and the values its sentence names. */
export type CheckSentence = {
	key: ParseKeys;
	values: Record<string, string | number>;
};

/**
 * The sentence for one check. Pure: the API sends codes and ids only, and the
 * app writes every sentence (ADR-0003), naming the member, shift and day.
 */
export const checkSentence = (
	check: RosterCheck,
	names: CheckNames
): CheckSentence => ({
	key: `scheduling.rosterEdit.check.${check.code}`,
	values: {
		name: names.member(check.membershipId),
		shift: names.shift(check.shiftId),
		day: names.day(check.day),
		before: check.countBefore ?? 0,
		after: check.countAfter ?? 0,
	},
});
