import type { OvertimeDepartment } from "@/features/dashboard/api";
import type {
	RosterChangeDepartment,
	StaffingRule,
} from "@/features/reports/api";

/*
 * What each Reports section found, as a sentence key and its values, so the
 * heading states the finding rather than naming the table. Pure: the page
 * translates the key under `reports.<section>.findings`.
 */

/** A finding: the key of its sentence and the values the sentence takes. */
export type Finding = {
	key: string;
	values?: Record<string, string | number>;
};

/**
 * Why a rule's shifts run short: too few people hold its job titles to staff
 * it (a hiring question, which no cover can fix), or one-off gaps such as
 * leave on rosters already made.
 */
export type StaffingCause = "TOO_FEW_PEOPLE" | "ONE_OFF";

/** Whether the people holding a rule's titles cannot staff it, per shift or across the week. */
const hasTooFewPeople = (rule: StaffingRule): boolean =>
	rule.peopleWithTitles < rule.headcount ||
	(rule.holderDaysAWeek !== null &&
		rule.holderDaysAWeek < rule.neededShiftDaysAWeek);

/** A rule's cause of shortage, or undefined when nothing ran short and nothing will. */
export const staffingCauseOf = (
	rule: StaffingRule
): StaffingCause | undefined => {
	if (hasTooFewPeople(rule)) return "TOO_FEW_PEOPLE";
	return rule.gapsInRange > 0 ? "ONE_OFF" : undefined;
};

/** Adds a number up by a key, keeping the order keys are first met. */
const totalsBy = <T>(
	items: ReadonlyArray<T>,
	keyOf: (item: T) => string,
	amountOf: (item: T) => number
): Map<string, number> => {
	const totals = new Map<string, number>();
	for (const item of items)
		totals.set(keyOf(item), (totals.get(keyOf(item)) ?? 0) + amountOf(item));
	return totals;
};

/** The key with the largest total, the first met on a tie. */
const largest = (totals: Map<string, number>): [string, number] | undefined =>
	[...totals].reduce<[string, number] | undefined>(
		(best, entry) => (best === undefined || entry[1] > best[1] ? entry : best),
		undefined
	);

/**
 * Staffing: where people ran short, and whether one rule explains most of it.
 * One rule that holds at least half of the worst branch's shortfall is named.
 */
export const staffingFinding = (
	rules: ReadonlyArray<StaffingRule>
): Finding => {
	const byBranch = totalsBy(
		rules,
		(rule) => rule.branchName,
		(rule) => rule.gapsInRange
	);
	const worst = largest(byBranch);
	if (worst === undefined || worst[1] === 0) return { key: "noGaps" };
	const [branch, total] = worst;
	const topRule = rules
		.filter((rule) => rule.branchName === branch)
		.reduce((best, rule) =>
			rule.gapsInRange > best.gapsInRange ? rule : best
		);
	if (topRule.gapsInRange * 2 >= total)
		return {
			key: "oneRule",
			values: {
				branch,
				total,
				rule: topRule.ruleName,
				count: topRule.gapsInRange,
			},
		};
	return { key: "branch", values: { branch, total } };
};

/** The people of one standing over the rows, each counted once. */
const peopleWith = (
	departments: ReadonlyArray<OvertimeDepartment>,
	standing: "NEAR" | "OVER"
): number =>
	new Set(
		departments.flatMap((row) =>
			row.members
				.filter((member) => member.standing === standing)
				.map((member) => member.membershipId)
		)
	).size;

/** Overtime: who went over the monthly limit, else who came near it, else where most was rostered. */
export const overtimeFinding = (
	departments: ReadonlyArray<OvertimeDepartment>
): Finding => {
	const byDepartment = totalsBy(
		departments,
		(row) => row.departmentName,
		(row) => row.overtimeMinutes
	);
	const most = largest(byDepartment);
	if (most === undefined || most[1] === 0) return { key: "none" };
	const over = peopleWith(departments, "OVER");
	if (over > 0) return { key: "overLimit", values: { count: over } };
	const near = peopleWith(departments, "NEAR");
	if (near > 0) return { key: "nearLimit", values: { count: near } };
	return { key: "withinLimit", values: { department: most[0] } };
};

/** Changes after publishing: how many, and the reason behind most of them. */
export const stabilityFinding = (
	departments: ReadonlyArray<RosterChangeDepartment>
): Finding => {
	const byReason = totalsBy(
		departments.flatMap((row) => row.reasons),
		(reason) => reason.reason,
		(reason) => reason.changes
	);
	const total = departments.reduce((sum, row) => sum + row.totalChanges, 0);
	const main = largest(byReason);
	if (total === 0 || main === undefined) return { key: "none" };
	return { key: "mostly", values: { count: total, reason: main[0] } };
};
