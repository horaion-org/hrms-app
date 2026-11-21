import type {
	CoverOptions,
	CoverUnavailableReason,
} from "@/features/scheduling/cover/api";
import type {
	NotAssignedPerson,
	NotAssignedReason,
	RepairOptions,
} from "@/features/scheduling/cover/engineRepairApi";
import {
	callInOption,
	repairOptionsFixture,
} from "@/features/scheduling/cover/engineRepairFixtures";
import {
	coverOptionFixture,
	coverOptionsFixture,
} from "@/features/scheduling/cover/fixtures";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

/*
 * The two recorded cases where the hours-based list and the engine
 * contradicted each other on who was on leave, for tests; never sent
 * anywhere. The people and both
 * answers are as recorded; the gap is the fixtures' own Front Desk AM on
 * Saturday 17 October, so the panel can name the shift.
 */

/** Someone on a roster, as its rows name them. */
type RosterMember = NonNullable<ScheduleAssignment["member"]>;

/** One case: the roster's people, the backend's list and the engine's answer. */
export type NotAssignedLeaveCase = {
	members: Array<RosterMember>;
	cover: CoverOptions;
	engine: RepairOptions;
};

const GAP_DAY = coverOptionsFixture().gap.day;

/** A roster member called `name`, with ids made from the first name: "m-tamsin", "mp-tamsin". */
const member = (
	name: string,
	jobTitleName: string,
	partTime = false
): RosterMember => {
	const firstName = name.split(" ")[0]!.toLowerCase();
	return {
		membershipId: `m-${firstName}`,
		memberProfileId: `mp-${firstName}`,
		displayName: name,
		employeeCode: `EMP-${firstName}`,
		jobTitleName,
		partTime,
	};
};

/** One of the engine's reasons, by its code. */
const reason = (
	code: string,
	named: Partial<NotAssignedReason> = {}
): NotAssignedReason => ({
	code,
	rule: null,
	constraintId: null,
	constraintName: null,
	...named,
});

/** The engine's line for one person: able to take the shift when it gives no reason. */
const notAssigned = (
	person: RosterMember,
	reasons: Array<NotAssignedReason> = []
): NotAssignedPerson => ({
	memberProfileId: person.memberProfileId,
	name: person.displayName ?? "",
	couldTake: reasons.length === 0,
	reasons,
});

/** The backend's "Can't help" line for one person. */
const cantHelp = (
	person: RosterMember,
	why: CoverUnavailableReason
): CoverOptions["unavailable"][number] => ({
	membershipId: person.membershipId,
	reason: why,
});

const ORLA = member("Orla Vance", "Supervisor");
const PIET = member("Piet Hollis", "Supervisor");
const TAMSIN = member("Tamsin Okafor", "Assistant");
const QUINN = member("Quinn Adebayo", "Assistant");
const SOREN = member("Soren Mbeki", "Assistant");
const VIKTOR = member("Viktor Nakamura", "Assistant", true);

/**
 * Rule Lab, issue I1: the gap is one Assistant short. The backend lists the
 * two Supervisors first (by name), then Tamsin; the engine calls in Tamsin
 * and explains only the Assistants.
 */
export const ruleLabCase = (): NotAssignedLeaveCase => ({
	members: [ORLA, PIET, TAMSIN, QUINN, SOREN, VIKTOR],
	cover: coverOptionsFixture({
		options: [ORLA, PIET, TAMSIN].map((person) =>
			coverOptionFixture({ membershipId: person.membershipId })
		),
		unavailable: [
			cantHelp(QUINN, "REST_DAY"),
			cantHelp(SOREN, "ALREADY_WORKING"),
			cantHelp(VIKTOR, "OUTSIDE_AVAILABILITY"),
		],
	}),
	engine: repairOptionsFixture(
		[
			callInOption({
				cells: [
					{
						membershipId: TAMSIN.membershipId,
						day: GAP_DAY,
						kind: "WORK",
						shiftId: coverOptionsFixture().gap.shiftId,
					},
				],
				people: [
					{
						membershipId: TAMSIN.membershipId,
						displayName: TAMSIN.displayName,
						weekMinutes: null,
						takenOffThisShift: false,
					},
				],
			}),
		],
		[
			notAssigned(TAMSIN),
			notAssigned(QUINN, [
				reason("breaks_rule", { rule: "most_days_a_week" }),
				reason("breaks_rule", { rule: "rest_days_each_week" }),
			]),
			notAssigned(SOREN, [reason("works_another_shift")]),
			notAssigned(VIKTOR, [reason("on_leave")]),
		]
	),
});

const BERNICE = member("Bernice Loh", "Concierge");
const CALVIN = member("Calvin Ang", "Receptionist");
const DEWI = member("Dewi Santoso", "Receptionist");
const ELAINE = member("Elaine Pang", "Receptionist", true);
const FIKRI = member("Fikri Jamal", "Concierge");

/**
 * Front Desk, Sunday Late, 22 to 28 February 2027: the gap is one
 * Receptionist short. The backend lists Calvin first, then Elaine (a
 * part-timer with no shift that day) and Fikri, a Concierge; the engine finds
 * no way to fill it, refuses Calvin for the rest between shifts, and calls
 * Elaine "on leave".
 */
export const frontDeskSundayLateCase = (): NotAssignedLeaveCase => ({
	members: [BERNICE, CALVIN, DEWI, ELAINE, FIKRI],
	cover: coverOptionsFixture({
		options: [CALVIN, ELAINE, FIKRI].map((person) =>
			coverOptionFixture({ membershipId: person.membershipId })
		),
		unavailable: [
			cantHelp(BERNICE, "ALREADY_WORKING"),
			cantHelp(DEWI, "ALREADY_WORKING"),
		],
	}),
	engine: repairOptionsFixture(
		[],
		[
			notAssigned(CALVIN, [
				reason("breaks_rule", {
					rule: "minimum_rest_between_shifts",
					constraintId: "c-rest",
					constraintName: "Rest between shifts",
				}),
			]),
			notAssigned(DEWI, [reason("works_another_shift")]),
			notAssigned(ELAINE, [reason("on_leave")]),
		]
	),
});

/** A case's lookup from a roster member's membership id to the profile id the engine names them by. */
export const profileIdIn =
	(members: ReadonlyArray<RosterMember>) =>
	(membershipId: string): string | undefined =>
		members.find((person) => person.membershipId === membershipId)
			?.memberProfileId;
