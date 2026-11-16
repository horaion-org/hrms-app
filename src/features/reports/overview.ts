import type {
	OvertimeDepartment,
	Shortage,
	StaffingRule,
} from "@/features/dashboard/api";
import type { NextRosterRow } from "@/features/dashboard/nextRoster";
import type { RosterChangeDepartment } from "@/features/reports/api";
import {
	shortShiftsByCause,
	unstaffableRuleOf,
	unstaffableRulesOf,
	type UnstaffableRule,
} from "@/features/dashboard/shortCauses";

/*
 * The Overview's figures, worked out from the reports' reads so the page
 * only renders them: is anything wrong, where, how badly, and is it getting
 * better or worse. Pure.
 */

/** How a unit or a figure stands: something to act on, something to watch, or neither. */
export type Standing = "ACT" | "WATCH" | "ON_TRACK";

/** What the Overview compares: Branches across the company, or the Departments of one Branch. */
export type OverviewGrouping = "branch" | "department";

/** Everything the Overview is worked out from. */
export type OverviewReads = {
	/** The shifts short over the coming days. */
	shortages: ReadonlyArray<Shortage>;
	/** The shifts that were short over the same number of days before. */
	shortagesBefore: ReadonlyArray<Shortage>;
	/** The staffing rules, which say why a shift is short. */
	rules: ReadonlyArray<StaffingRule>;
	/** Overtime by department over last month and this one. */
	overtime: ReadonlyArray<OvertimeDepartment>;
	/** This month, as "yyyy-MM". */
	thisMonth: string;
	/** Each Department's coming week. */
	nextRoster: ReadonlyArray<NextRosterRow>;
	/** Whether the person may read rosters, without which nothing is said about next week. */
	rostersInReach: boolean;
	/** Changes to published rosters this month. */
	changes: ReadonlyArray<RosterChangeDepartment>;
	/** Changes to published rosters last month. */
	changesBefore: ReadonlyArray<RosterChangeDepartment>;
	grouping: OverviewGrouping;
	/** A Branch's name by id, for the reads that carry only its id. */
	branchNameOf: (branchId: string) => string | undefined;
};

/** One unit's row: what is wrong there and how badly. */
export type OverviewUnit = {
	name: string;
	standing: Standing;
	/** People short over the coming days. */
	peopleShort: number;
	/** The rules too few people can staff that leave a shift short. */
	rulesShort: Array<StaffingRule>;
	/** People over the monthly overtime limit this month, and near it. */
	overLimit: number;
	nearLimit: number;
	/** The Departments whose coming week is published, of those to roster. */
	published: number;
	rosters: number;
	/** Changes to published rosters this month. */
	changes: number;
};

/** The company-wide figures, each beside what it is compared with. */
export type OverviewFigures = {
	peopleShort: number;
	peopleShortBefore: number;
	overLimit: number;
	nearLimit: number;
	overLimitBefore: number;
	published: number;
	rosters: number;
	changes: number;
	changesBefore: number;
};

/** The Overview: its figures, each unit worst first, and the rules behind the shortfall. */
export type Overview = {
	figures: OverviewFigures;
	units: Array<OverviewUnit>;
	/** Every rule too few people can staff that leaves a shift short, most people short first. */
	rulesShort: Array<{ rule: StaffingRule; unit: string; peopleShort: number }>;
	/** The same rules as Home lists them, each with the shifts it leaves short: the hiring case. */
	causes: Array<UnstaffableRule>;
	/** Whether next week's rosters are counted at all; without the roster read they are left unsaid, never shown as none. */
	rostersInReach: boolean;
};

/** A row that names its Branch and Department. */
type Named = { branchName: string; departmentName: string };

const sumOf = <T>(
	rows: ReadonlyArray<T>,
	amountOf: (row: T) => number
): number => rows.reduce((sum, row) => sum + amountOf(row), 0);

/** The people of one standing in a month's overtime rows, each counted once. */
const peopleWith = (
	rows: ReadonlyArray<OvertimeDepartment>,
	standing: "NEAR" | "OVER"
): number =>
	new Set(
		rows.flatMap((row) =>
			row.members
				.filter((member) => member.standing === standing)
				.map((member) => member.membershipId)
		)
	).size;

/** A unit's standing: act on a rule nobody can staff or someone over the limit; watch anything else amiss. */
const standingOf = (unit: Omit<OverviewUnit, "standing">): Standing => {
	if (unit.rulesShort.length > 0 || unit.overLimit > 0) return "ACT";
	const amiss =
		unit.peopleShort > 0 || unit.nearLimit > 0 || unit.published < unit.rosters;
	return amiss ? "WATCH" : "ON_TRACK";
};

/** Units to act on first, then to watch, each by people short, then by name. */
const STANDING_ORDER: Record<Standing, number> = {
	ACT: 0,
	WATCH: 1,
	ON_TRACK: 2,
};
const worstFirst = (first: OverviewUnit, second: OverviewUnit): number =>
	STANDING_ORDER[first.standing] - STANDING_ORDER[second.standing] ||
	second.peopleShort - first.peopleShort ||
	first.name.localeCompare(second.name);

/** Works the Overview out from its reads. */
export const overviewOf = (reads: OverviewReads): Overview => {
	const unitOf = (row: Named): string =>
		reads.grouping === "branch" ? row.branchName : row.departmentName;
	const unitOfRoster = (row: NextRosterRow): string =>
		reads.grouping === "branch"
			? (reads.branchNameOf(row.branchId) ?? row.branchId)
			: row.departmentName;
	const overtimeNow = reads.overtime.filter(
		(row) => row.month === reads.thisMonth
	);
	const overtimeBefore = reads.overtime.filter(
		(row) => row.month !== reads.thisMonth
	);
	const unstaffable = unstaffableRulesOf(reads.rules);
	const ruleOf = (shortage: Shortage): StaffingRule | undefined =>
		unstaffableRuleOf(shortage, unstaffable);

	const names = new Set([
		...[
			...reads.shortages,
			...reads.rules,
			...overtimeNow,
			...reads.changes,
		].map(unitOf),
		...reads.nextRoster.map(unitOfRoster),
	]);
	const units = [...names]
		.map((name): OverviewUnit => {
			const short = reads.shortages.filter((row) => unitOf(row) === name);
			const overtime = overtimeNow.filter((row) => unitOf(row) === name);
			const rosters = reads.nextRoster.filter(
				(row) => unitOfRoster(row) === name
			);
			const unit = {
				name,
				peopleShort: sumOf(short, (row) => row.shortBy),
				rulesShort: [
					...new Set(
						short
							.map(ruleOf)
							.filter((rule): rule is StaffingRule => rule !== undefined)
					),
				],
				overLimit: peopleWith(overtime, "OVER"),
				nearLimit: peopleWith(overtime, "NEAR"),
				published: rosters.filter((row) => row.step === "done").length,
				rosters: rosters.length,
				changes: sumOf(
					reads.changes.filter((row) => unitOf(row) === name),
					(row) => row.totalChanges
				),
			};
			return { ...unit, standing: standingOf(unit) };
		})
		.sort(worstFirst);

	const rulesShort = unstaffable
		.map((rule) => ({
			rule,
			unit: unitOf(rule),
			peopleShort: sumOf(
				reads.shortages.filter((shortage) => ruleOf(shortage) === rule),
				(shortage) => shortage.shortBy
			),
		}))
		.filter((each) => each.peopleShort > 0)
		.sort((first, second) => second.peopleShort - first.peopleShort);

	return {
		figures: {
			peopleShort: sumOf(reads.shortages, (row) => row.shortBy),
			peopleShortBefore: sumOf(reads.shortagesBefore, (row) => row.shortBy),
			overLimit: peopleWith(overtimeNow, "OVER"),
			nearLimit: peopleWith(overtimeNow, "NEAR"),
			overLimitBefore: peopleWith(overtimeBefore, "OVER"),
			published: reads.nextRoster.filter((row) => row.step === "done").length,
			rosters: reads.nextRoster.length,
			changes: sumOf(reads.changes, (row) => row.totalChanges),
			changesBefore: sumOf(reads.changesBefore, (row) => row.totalChanges),
		},
		units,
		rulesShort,
		causes: shortShiftsByCause(reads.shortages, reads.rules).unstaffable,
		rostersInReach: reads.rostersInReach,
	};
};

/** How each figure stands, by the same rules as a unit. */
export const figureStandings = (
	overview: Overview
): Record<"peopleShort" | "overLimit" | "published" | "changes", Standing> => {
	const { figures, rulesShort } = overview;
	const whenAmiss = (act: boolean, watch: boolean): Standing => {
		if (act) return "ACT";
		return watch ? "WATCH" : "ON_TRACK";
	};
	return {
		peopleShort: whenAmiss(rulesShort.length > 0, figures.peopleShort > 0),
		overLimit: whenAmiss(figures.overLimit > 0, figures.nearLimit > 0),
		published: whenAmiss(false, figures.published < figures.rosters),
		changes: whenAmiss(false, figures.changes > figures.changesBefore),
	};
};

/** One sentence of the headline: the key of its words and the values they take. */
export type HeadlineSentence = {
	key:
		| "allOnTrack"
		| "allOnTrackWithoutRosters"
		| "nothingToActOn"
		| "needsAttention"
		| "shortBecause"
		| "overLimit"
		| "restOnTrack";
	values: Record<string, string | number>;
};

/**
 * The Overview in words, most important first: which units need attention,
 * the largest shortfall and the rule behind it, anyone over the overtime
 * limit, and how many units are on track. One sentence when all is well,
 * which leaves next week unsaid for someone who may not read rosters; with
 * something to watch and nothing to act on, it says so. None when there is
 * no unit to speak of.
 */
export const overviewHeadline = (
	overview: Overview
): Array<HeadlineSentence> => {
	const toActOn = overview.units.filter((unit) => unit.standing === "ACT");
	const onTrack = overview.units.filter((unit) => unit.standing === "ON_TRACK");
	if (overview.units.length === 0) return [];
	if (onTrack.length === overview.units.length)
		return [
			{
				key: overview.rostersInReach
					? "allOnTrack"
					: "allOnTrackWithoutRosters",
				values: { count: overview.units.length },
			},
		];
	const worstRule = overview.rulesShort[0];
	return [
		toActOn.length > 0
			? {
					key: "needsAttention" as const,
					values: {
						count: toActOn.length,
						units: toActOn.map((unit) => unit.name).join(", "),
					},
				}
			: { key: "nothingToActOn" as const, values: {} },
		...(worstRule
			? [
					{
						key: "shortBecause" as const,
						values: {
							unit: worstRule.unit,
							short: worstRule.peopleShort,
							rule: worstRule.rule.ruleName,
							needed: worstRule.rule.headcount,
							// The sentence agrees with the people who hold the titles.
							count: worstRule.rule.peopleWithTitles,
						},
					},
				]
			: []),
		...(overview.figures.overLimit > 0
			? [
					{
						key: "overLimit" as const,
						values: { count: overview.figures.overLimit },
					},
				]
			: []),
		...(onTrack.length > 0
			? [{ key: "restOnTrack" as const, values: { count: onTrack.length } }]
			: []),
	];
};
