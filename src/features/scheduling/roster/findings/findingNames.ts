import type {
	GenerationFindings,
	ScheduleAssignment,
	ScheduleConstraint,
	ScheduleShift,
} from "@/features/scheduling/schedules/api";

/**
 * The names the findings' ids stand for, so a finding is shown with names and
 * never with an id. Each map holds only what resolved.
 */
export type FindingNames = {
	/** By the engine's employee id (the member profile). */
	members: ReadonlyMap<string, string>;
	/** By the frozen shift copy's id. */
	shifts: ReadonlyMap<string, string>;
	/** By job title id. */
	jobTitles: ReadonlyMap<string, string>;
	/** By the frozen constraint copy's id, which a conflict names as `sourceRuleId`. */
	rules: ReadonlyMap<string, string>;
	/** By the frozen constraint copy's id, the day types its rule is about, as codes; only rules that name any. */
	ruleDayTypes: ReadonlyMap<string, ReadonlyArray<string>>;
};

/** What the names are read from besides the findings; each list may be empty when it isn't readable. */
export type FindingNameSources = {
	assignments: ReadonlyArray<ScheduleAssignment>;
	shifts: ReadonlyArray<Pick<ScheduleShift, "shiftId" | "name" | "roles">>;
	constraints: ReadonlyArray<
		Pick<ScheduleConstraint, "constraintId" | "name" | "values">
	>;
};

const memberNames = (
	members: GenerationFindings["members"]
): Map<string, string> =>
	new Map(
		members.flatMap(({ memberProfileId, displayName }) =>
			displayName === null ? [] : [[memberProfileId, displayName] as const]
		)
	);

const shiftNames = ({
	assignments,
	shifts,
}: FindingNameSources): Map<string, string> =>
	new Map([
		...assignments.flatMap(({ shift }) =>
			shift === null ? [] : [[shift.shiftId, shift.name] as const]
		),
		...shifts.map(({ shiftId, name }) => [shiftId, name] as const),
	]);

const jobTitleNames = ({
	assignments,
	shifts,
}: FindingNameSources): Map<string, string> =>
	new Map([
		...assignments.flatMap(({ jobTitle }) =>
			jobTitle === null ? [] : [[jobTitle.jobTitleId, jobTitle.name] as const]
		),
		...shifts.flatMap(({ roles }) =>
			roles.map(({ jobTitleId, name }) => [jobTitleId, name] as const)
		),
	]);

/** Each rule's DAY_TYPE values, as the engine's day-type findings name them by the rule. */
const ruleDayTypes = ({
	constraints,
}: FindingNameSources): Map<string, ReadonlyArray<string>> =>
	new Map(
		constraints.flatMap(({ constraintId, values }) => {
			const dayTypes = values
				.filter((value) => value.field === "DAY_TYPE")
				.map((value) => value.value);
			return dayTypes.length === 0 ? [] : [[constraintId, dayTypes] as const];
		})
	);

/** Every name the findings can be shown with, from the findings' members, the roster and the schedule's setup. */
export const findingNames = (
	findings: Pick<GenerationFindings, "members">,
	sources: FindingNameSources
): FindingNames => ({
	members: memberNames(findings.members),
	shifts: shiftNames(sources),
	jobTitles: jobTitleNames(sources),
	rules: new Map(
		sources.constraints.map(({ constraintId, name }) => [constraintId, name])
	),
	ruleDayTypes: ruleDayTypes(sources),
});
