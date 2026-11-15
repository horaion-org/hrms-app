import type { TFunction } from "i18next";
import type {
	RepairExtraMinutes,
	RepairOption,
} from "@/features/scheduling/cover/engineRepairApi";
import type { RepairNames } from "@/features/scheduling/cover/engineRepairWords";

/*
 * What an engine repair option costs in hours, in the app's words, pure: the
 * API sends minutes by kind, the app writes the line (ADR-0003), with hours
 * as the page writes them. Only extra hours are said: a kind whose minutes
 * fall (a move that takes someone off overtime) is not extra, so it reads as
 * none.
 */

const key = "scheduling.cover.engine.hours";

/** The kinds of extra hours, in the order a line names them. */
const EXTRA_KINDS = ["overtime", "restDayWork", "timeOffEarned"] as const;

type ExtraKind = (typeof EXTRA_KINDS)[number];

/** The person the option's hours are about: the first move's, as the roster names them. */
const personOf = (
	option: RepairOption,
	names: RepairNames,
	t: TFunction
): string => {
	const move = option.moves.find(
		(candidate) =>
			candidate.displayName !== null || candidate.membershipId !== null
	);
	if (move?.displayName) return move.displayName;
	if (move?.membershipId) return names.member(move.membershipId);
	return t("scheduling.detail.formerMember");
};

/** The kinds that add hours, with their minutes. */
const extraKindsOf = (
	minutes: RepairExtraMinutes
): Array<{ kind: ExtraKind; minutes: number }> =>
	EXTRA_KINDS.filter((kind) => minutes[kind] > 0).map((kind) => ({
		kind,
		minutes: minutes[kind],
	}));

/** "8 h of overtime, 8 h of rest-day work and 4 h of time off earned". */
const listOf = (parts: Array<string>, t: TFunction): string =>
	parts.length <= 1
		? (parts[0] ?? "")
		: `${parts.slice(0, -1).join(", ")}${t(`${key}.and`)}${parts[parts.length - 1] ?? ""}`;

/**
 * One line about the option's hours: "No extra hours.", one kind in its own
 * sentence ("Adds 8 h of overtime for Lina Tan that week."), or several in
 * one; nothing for an option from the older repair, which says no hours.
 */
export const extraHoursLine = (
	option: RepairOption,
	names: RepairNames,
	t: TFunction
): string | undefined => {
	if (!option.extraMinutes) return undefined;
	const extra = extraKindsOf(option.extraMinutes);
	if (extra.length === 0) return t(`${key}.none`);
	const name = personOf(option, names, t);
	const [only] = extra;
	if (extra.length === 1 && only)
		return t(`${key}.only.${only.kind}`, {
			hours: names.hours(only.minutes),
			name,
		});
	const parts = extra.map(({ kind, minutes }) =>
		t(`${key}.part.${kind}`, { hours: names.hours(minutes) })
	);
	return t(`${key}.several`, { parts: listOf(parts, t), name });
};
