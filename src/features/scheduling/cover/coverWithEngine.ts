import type {
	CoverOption,
	CoverOptions,
	CoverUnavailable,
	CoverUnavailableReason,
} from "@/features/scheduling/cover/api";
import type {
	NotAssignedPerson,
	NotAssignedReason,
	RepairOption,
} from "@/features/scheduling/cover/engineRepairApi";
import { optionHeadingKey } from "@/features/scheduling/cover/engineRepairWords";
import {
	couldTakeTheShift,
	NO_SHIFT_PART_TIME,
} from "@/features/scheduling/cover/notAssignedWords";

/*
 * "Who covers" once the engine has answered, pure: the backend's list ranks
 * by extra hours and checks no scheduling rule, so the engine's answer is
 * merged into it. The engine's choice comes first and is the one suggested,
 * people the engine refuses move under "Can't help" with its reason, and
 * people it never looked at say so. Before it answers the list is the
 * backend's own, with nobody suggested.
 */

/** The engine's reason for someone it had no time to check: not a refusal. */
const NOT_CHECKED = "not_checked";

/** The engine's reason for someone on leave, which it also gives a part-timer on a day without a shift. */
const ON_LEAVE = "on_leave";

/** The engine's reason for someone not available for the shift's hours. */
const OUTSIDE_AVAILABILITY = "outside_availability";

/** The engine's reasons that do not refuse a candidate of the backend's list. */
const REASONS_THAT_DO_NOT_REFUSE: ReadonlyArray<string> = [
	NOT_CHECKED,
	ON_LEAVE,
];

/** The backend's reasons that agree with the engine's "on leave". */
const BACKEND_LEAVE_REASONS: ReadonlyArray<CoverUnavailableReason> = [
	"ON_LEAVE",
	"NOT_AVAILABLE",
];

/** The reason shown for someone the engine refuses without saying why. */
const NO_REASON_GIVEN: NotAssignedReason = {
	code: "no_reason_given",
	rule: null,
	constraintId: null,
	constraintName: null,
};

/** The engine's answer for the gap: its options, and why each person was not assigned. */
export type EngineAnswer = {
	options: ReadonlyArray<RepairOption>;
	notAssigned?: ReadonlyArray<NotAssignedPerson> | null;
};

/** What the engine said of someone in "Who covers", as a code the panel words. */
export type CoverEngineNote =
	| "fills"
	| "couldTake"
	| "notConsidered"
	| "notCheckedInTime"
	| "partTimeNoShift";

/** What the list's order means: the backend's own, or the engine's choice first. */
export type CoverOrder = "byExtraHours" | "engineFirst";

/** Someone under "Can't help": by the backend's reason, or by the engine's for a candidate it refuses. */
export type CoverUnavailableWithEngine =
	CoverUnavailable | { membershipId: string; engineReason: NotAssignedReason };

/** "Who covers" with the engine's answer merged in. */
export type CoverWithEngine = {
	order: CoverOrder;
	/** The people who can cover: the engine's choice first, then those it says could take the shift, then the rest. */
	options: Array<CoverOption>;
	/** The membership id of the one person badged "Suggested"; nobody until the engine names one. */
	suggested: string | undefined;
	/** What the engine said of each person in `options`, by membership id. */
	engineNote: Record<string, CoverEngineNote>;
	/** "Can't help": the candidates the engine refuses first, then the backend's own. */
	unavailable: Array<CoverUnavailableWithEngine>;
	/** The engine's "Why nobody was assigned", with "on leave" corrected where the backend knows better; null without one. */
	notAssigned: Array<NotAssignedPerson> | null;
};

/** The engine refuses the candidate: they move under "Can't help". */
const REFUSED = "refused";

/** What the engine's answer makes of one candidate. */
type Verdict = CoverEngineNote | typeof REFUSED;

/** The verdicts that are placed before the rest of the list, or taken out of it. */
const PLACED_BY_VERDICT: ReadonlyArray<Verdict> = [
	"fills",
	"couldTake",
	REFUSED,
];

/** A candidate of the backend's list, the engine's person for them, and the verdict. */
type JudgedCandidate<V extends Verdict = Verdict> = {
	option: CoverOption;
	person: NotAssignedPerson | undefined;
	verdict: V;
};

/** Whether the engine refuses the person: they could not take the shift, for a reason that is a refusal. */
const isRefused = (person: NotAssignedPerson): boolean =>
	!couldTakeTheShift(person) &&
	!REASONS_THAT_DO_NOT_REFUSE.includes(person.reasons[0]?.code ?? "");

/** What the engine's answer makes of a candidate: refused first, then its choice, then what it said of them. */
const verdictOf = (
	person: NotAssignedPerson | undefined,
	calledInToFill: boolean
): Verdict => {
	if (person && isRefused(person)) return REFUSED;
	if (calledInToFill) return "fills";
	if (!person) return "notConsidered";
	if (couldTakeTheShift(person)) return "couldTake";
	return person.reasons[0]?.code === NOT_CHECKED
		? "notCheckedInTime"
		: "partTimeNoShift";
};

/** Whether the candidate stays in "Who covers". */
const isKept = (
	candidate: JudgedCandidate
): candidate is JudgedCandidate<CoverEngineNote> =>
	candidate.verdict !== REFUSED;

/**
 * The people the engine calls in to the gap's own shift and day in an option
 * that fills the gap, in the engine's order, each once.
 */
const calledInToFillTheGap = (
	engineOptions: ReadonlyArray<RepairOption>,
	gap: CoverOptions["gap"]
): Array<string> => {
	const membershipIds = engineOptions
		.filter((option) => optionHeadingKey(option) === "fills")
		.flatMap((option) => option.moves)
		.filter(
			(move) =>
				move.kind === "CALL_IN" &&
				move.shiftId === gap.shiftId &&
				move.date === gap.day
		)
		.flatMap((move) => (move.membershipId === null ? [] : [move.membershipId]));
	return [...new Set(membershipIds)];
};

/** What the backend says of someone: a candidate, or why they can't help. */
type BackendSays = CoverUnavailableReason | "CANDIDATE";

/** What the backend says of each person it lists, by the profile id the engine names them by. */
const backendSaysByProfile = (
	options: CoverOptions,
	profileIdOf: (membershipId: string) => string | undefined
): Map<string, BackendSays> => {
	const said: Array<[membershipId: string, says: BackendSays]> = [
		...options.unavailable.map((person): [string, BackendSays] => [
			person.membershipId,
			person.reason,
		]),
		...options.options.map((option): [string, BackendSays] => [
			option.membershipId,
			"CANDIDATE",
		]),
	];
	return new Map(
		said.flatMap(([membershipId, says]) => {
			const profileId = profileIdOf(membershipId);
			return profileId === undefined ? [] : [[profileId, says] as const];
		})
	);
};

/**
 * The engine's "on leave" for one person, corrected by what the backend says
 * of them: kept when the backend also says leave (or hides it), or does not
 * list the person at all; "not available" when the backend says so; otherwise
 * a part-timer's day without a shift, which the engine is sent as leave.
 */
const correctedLeaveCode = (backendSays: BackendSays | undefined): string => {
	if (backendSays === undefined || BACKEND_LEAVE_REASONS.includes(backendSays))
		return ON_LEAVE;
	return backendSays === "OUTSIDE_AVAILABILITY"
		? OUTSIDE_AVAILABILITY
		: NO_SHIFT_PART_TIME;
};

/** The engine's list with each "on leave" corrected by what the backend says of that person. */
const withCorrectedLeave = (
	notAssigned: ReadonlyArray<NotAssignedPerson>,
	backendSays: Map<string, BackendSays>
): Array<NotAssignedPerson> =>
	notAssigned.map((person) => ({
		...person,
		reasons: person.reasons.map((reason) =>
			reason.code === ON_LEAVE
				? {
						...reason,
						code: correctedLeaveCode(backendSays.get(person.memberProfileId)),
					}
				: reason
		),
	}));

/**
 * Merges the engine's answer into "Who covers". Without an answer, or with
 * one that cannot say why people were not assigned, the backend's list comes
 * back unchanged with nobody suggested. `profileIdOf` gives a roster member's
 * profile id, which is how the engine names people.
 */
export const coverWithEngine = (
	options: CoverOptions,
	engine: EngineAnswer | undefined,
	profileIdOf: (membershipId: string) => string | undefined
): CoverWithEngine => {
	if (!engine?.notAssigned)
		return {
			order: "byExtraHours",
			options: options.options,
			suggested: undefined,
			engineNote: {},
			unavailable: options.unavailable,
			notAssigned: null,
		};

	const explained = engine.notAssigned;
	const calledIn = calledInToFillTheGap(engine.options, options.gap);
	const judged = options.options.map((option): JudgedCandidate => {
		const profileId = profileIdOf(option.membershipId);
		const person = explained.find(
			(candidate) => candidate.memberProfileId === profileId
		);
		const calledInToFill = calledIn.includes(option.membershipId);
		return { option, person, verdict: verdictOf(person, calledInToFill) };
	});
	const fills = calledIn.flatMap((membershipId) =>
		judged.filter(
			(candidate) =>
				candidate.verdict === "fills" &&
				candidate.option.membershipId === membershipId
		)
	);
	const couldTake = judged.filter(
		(candidate) => candidate.verdict === "couldTake"
	);
	const theRest = judged.filter(
		(candidate) => !PLACED_BY_VERDICT.includes(candidate.verdict)
	);
	const kept = [...fills, ...couldTake, ...theRest].filter(isKept);
	const refused = judged.filter((candidate) => !isKept(candidate));

	return {
		order: "engineFirst",
		options: kept.map((candidate) => candidate.option),
		suggested: (fills[0] ?? couldTake[0])?.option.membershipId,
		engineNote: Object.fromEntries(
			kept.map((candidate) => [
				candidate.option.membershipId,
				candidate.verdict,
			])
		),
		unavailable: [
			...refused.map((candidate) => ({
				membershipId: candidate.option.membershipId,
				engineReason: candidate.person?.reasons[0] ?? NO_REASON_GIVEN,
			})),
			...options.unavailable,
		],
		notAssigned: withCorrectedLeave(
			explained,
			backendSaysByProfile(options, profileIdOf)
		),
	};
};

/**
 * The engine's why-not list with each "on leave" corrected by what the
 * backend's hours-based list says of that person (`correctedLeaveCode`);
 * `profileIdOf` gives a roster member's profile id, which is how the engine
 * names people. Pure.
 */
export const notAssignedWithLeaveCorrected = (
	notAssigned: ReadonlyArray<NotAssignedPerson>,
	backendList: CoverOptions,
	profileIdOf: (membershipId: string) => string | undefined
): Array<NotAssignedPerson> =>
	withCorrectedLeave(
		notAssigned,
		backendSaysByProfile(backendList, profileIdOf)
	);
