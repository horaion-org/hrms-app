import type { DepartmentConstraint } from "@/features/scheduling/constraints/api";

/** How many people hold each job title now, by the title's id, from the live job titles read. */
export type HoldersByJobTitle = ReadonlyMap<string, number>;

/** A staffing rule that asks for more people on a shift than hold its job titles. */
export type CapacityProblem = {
	headcount: number;
	peopleWithTitles: number;
	jobTitleNames: Array<string>;
};

/** What the capacity check reads of a constraint: the live rule as the constraints list answers it. */
export type CapacityRule = Pick<DepartmentConstraint, "status" | "values">;

/**
 * Why a rule can never be met, or none: it asks for at least, or exactly,
 * more people than hold its job titles now. The headcount and comparison
 * are the live rule's own; "at most" can always be met, and a switched-off
 * rule asks for nothing. Holders are added up per title, so someone holding
 * two of them counts twice: the check may miss a shortfall but never flags
 * a rule that can be met. A title missing from `holders` (gone, or outside
 * what the person may read) leaves the rule unflagged.
 */
export const capacityProblemOf = (
	rule: CapacityRule,
	holders: HoldersByJobTitle
): CapacityProblem | undefined => {
	const valuesOf = (field: string): CapacityRule["values"] =>
		rule.values.filter((value) => value.field === field);
	const headcount = Number(valuesOf("HEADCOUNT")[0]?.value);
	const comparison = valuesOf("COMPARISON")[0]?.value ?? "AT_LEAST";
	const jobTitles = valuesOf("JOB_TITLE");
	if (
		rule.status === "INACTIVE" ||
		comparison === "AT_MOST" ||
		!Number.isFinite(headcount) ||
		jobTitles.length === 0 ||
		jobTitles.some((jobTitle) => !holders.has(jobTitle.value))
	)
		return undefined;
	const peopleWithTitles = jobTitles.reduce(
		(sum, jobTitle) => sum + (holders.get(jobTitle.value) ?? 0),
		0
	);
	if (headcount <= peopleWithTitles) return undefined;
	return {
		headcount,
		peopleWithTitles,
		jobTitleNames: jobTitles.map((jobTitle) => jobTitle.name ?? jobTitle.value),
	};
};

/**
 * What the capacity check reads of one rule of the staffing read
 * (`GET /schedules/staffing`). The page that may make the read passes its
 * rules in, so scheduling never imports the feature that owns the read.
 */
export type StaffingRuleFacts = {
	departmentId: string;
	ruleName: string;
	/** How many people the rule asks for on each of its shifts. */
	headcount: number;
	/** How many people hold one of its job titles. */
	peopleWithTitles: number;
	jobTitles: ReadonlyArray<{ name: string }>;
};

/** How a department's rule is found among the staffing reads: by its department and its name, unique there. */
export const capacityKeyOf = (departmentId: string, ruleName: string): string =>
	`${departmentId}|${ruleName}`;

/** The staffing rules that can never be met, keyed by `capacityKeyOf`. */
export const capacityProblemsOf = (
	rules: ReadonlyArray<StaffingRuleFacts>
): Map<string, CapacityProblem> =>
	new Map(
		rules
			.filter((rule) => rule.headcount > rule.peopleWithTitles)
			.map((rule) => [
				capacityKeyOf(rule.departmentId, rule.ruleName),
				{
					headcount: rule.headcount,
					peopleWithTitles: rule.peopleWithTitles,
					jobTitleNames: rule.jobTitles.map((jobTitle) => jobTitle.name),
				},
			])
	);
