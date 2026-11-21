import type {
	CoverOptions,
	CoverUnavailableReason,
} from "@/features/scheduling/cover/api";
import type { NotAssignedPerson } from "@/features/scheduling/cover/engineRepairApi";
import { NO_SHIFT_PART_TIME } from "@/features/scheduling/cover/notAssignedWords";

/*
 * The engine's why-not list, corrected where the backend's hours-based list
 * knows better, pure: the engine is sent a part-timer's day without a shift
 * as leave, and someone outside their availability as on leave too, so its
 * "on leave" is read against what the backend says of that person.
 */

/** The engine's reason for someone on leave, which it also gives a part-timer on a day without a shift. */
const ON_LEAVE = "on_leave";

/** The engine's reason for someone not available for the shift's hours. */
const OUTSIDE_AVAILABILITY = "outside_availability";

/** The backend's reasons that agree with the engine's "on leave". */
const BACKEND_LEAVE_REASONS: ReadonlyArray<CoverUnavailableReason> = [
	"ON_LEAVE",
	"NOT_AVAILABLE",
];

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
