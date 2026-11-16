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

/** A staffing rule that asks for more people on a shift than hold its job titles. */
export type CapacityProblem = {
	headcount: number;
	peopleWithTitles: number;
	jobTitleNames: Array<string>;
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
