import type {
	DatesPlanWeek,
	PlanPerson,
} from "@/features/scheduling/dates/api";

/*
 * The people a schedule by dates rosters (API ADR-0136): everyone the
 * Department can roster, or the ones the manager chose. Plain values in and
 * out; undefined chosen ids always mean everyone, and so does every listed
 * person ticked, so a later joiner is still rostered on regeneration.
 */

/** The chosen people's member profile ids; undefined is everyone. */
export type ChosenPeople = ReadonlyArray<string> | undefined;

/** What the People line says: everyone, or how many of how many. */
export type PeopleSummary = {
	everyone: boolean;
	chosen: number;
	total: number;
};

/** What stops the chosen people from being generated. */
export type PeopleProblem = "nobodyChosen" | "daysTaken";

/** The listed people among the chosen ids, in the plan's order. */
const listedChosen = (
	chosen: ReadonlyArray<string>,
	people: ReadonlyArray<PlanPerson>
): Array<string> =>
	people
		.map((person) => person.memberProfileId)
		.filter((memberProfileId) => chosen.includes(memberProfileId));

/** The ids a body sends: undefined for everyone, chosen or ticked in full; else the chosen listed ids. */
export const memberProfileIdsToSend = (
	chosen: ChosenPeople,
	people: ReadonlyArray<PlanPerson>
): Array<string> | undefined => {
	if (chosen === undefined) return undefined;
	const listed = listedChosen(chosen, people);
	return listed.length === people.length ? undefined : listed;
};

/** The People line's facts: everyone, or the chosen count of the listed people. */
export const peopleSummaryOf = (
	chosen: ChosenPeople,
	people: ReadonlyArray<PlanPerson>
): PeopleSummary => {
	const sent = memberProfileIdsToSend(chosen, people);
	return {
		everyone: sent === undefined,
		chosen: sent?.length ?? people.length,
		total: people.length,
	};
};

/** The chosen ids cut to the people the plan still lists; everyone stays everyone. */
export const chosenAmongPlan = (
	chosen: ChosenPeople,
	people: ReadonlyArray<PlanPerson>
): ChosenPeople =>
	chosen === undefined ? undefined : listedChosen(chosen, people);

/** Whether generating the dates schedules again days that already have a schedule (API ADR-0129). */
const redoesDays = (weeks: ReadonlyArray<DatesPlanWeek>): boolean =>
	weeks.some((week) => week.redone.length > 0 || week.rest.length > 0);

/**
 * Why the chosen people can't be generated: nobody chosen, or people chosen
 * over days that already have a schedule (the API refuses it,
 * `SCHEDULE_PEOPLE_DAYS_TAKEN`); undefined when nothing stops them.
 */
export const peopleProblemOf = (
	chosen: ChosenPeople,
	people: ReadonlyArray<PlanPerson>,
	weeks: ReadonlyArray<DatesPlanWeek>
): PeopleProblem | undefined => {
	const sent = memberProfileIdsToSend(chosen, people);
	if (sent === undefined) return undefined;
	if (sent.length === 0) return "nobodyChosen";
	return redoesDays(weeks) ? "daysTaken" : undefined;
};
