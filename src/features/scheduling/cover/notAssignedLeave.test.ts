import { describe, expect, it } from "vitest";
import type { NotAssignedPerson } from "@/features/scheduling/cover/engineRepairApi";
import { coverOptionsFixture } from "@/features/scheduling/cover/fixtures";
import { NO_SHIFT_PART_TIME } from "@/features/scheduling/cover/notAssignedWords";
import { notAssignedWithLeaveCorrected } from "@/features/scheduling/cover/notAssignedLeave";
import {
	frontDeskSundayLateCase,
	profileIdIn,
	ruleLabCase,
} from "@/features/scheduling/cover/notAssignedLeaveFixtures";

/** The fixtures' own list: Aisha (m-1) first, Chen (m-3) as overtime, Ben (m-2) already working. */
const COVER = coverOptionsFixture();

/** The fixtures' roster names its people "mp-1" for "m-1", and so on. */
const profileIdOf = (membershipId: string): string =>
	membershipId.replace("m-", "mp-");

/** The engine's line for one person of the fixtures' roster, by reason codes. */
const said = (
	membershipId: string,
	codes: Array<string>,
	couldTake = false
): NotAssignedPerson => ({
	memberProfileId: profileIdOf(membershipId),
	name: membershipId,
	couldTake,
	reasons: codes.map((code) => ({
		code,
		rule: null,
		constraintId: null,
		constraintName: null,
	})),
});

/** The first reason code the merged engine list gives each person, by name. */
const firstCodes = (
	people: ReadonlyArray<NotAssignedPerson> | null
): Record<string, string | undefined> =>
	Object.fromEntries(
		(people ?? []).map((person) => [person.name, person.reasons[0]?.code])
	);

describe("notAssignedWithLeaveCorrected: the two recorded contradictions", () => {
	it("Rule Lab I1: someone outside their availability is not on leave", () => {
		const { members, cover, engine } = ruleLabCase();

		const people = notAssignedWithLeaveCorrected(
			engine.notAssigned ?? [],
			cover,
			profileIdIn(members)
		);

		expect(firstCodes(people)).toMatchObject({
			"Viktor Nakamura": "outside_availability",
			"Soren Mbeki": "works_another_shift",
		});
	});

	it("Front Desk Sunday Late: a part-timer with no shift that day is not on leave", () => {
		const { members, cover, engine } = frontDeskSundayLateCase();

		const people = notAssignedWithLeaveCorrected(
			engine.notAssigned ?? [],
			cover,
			profileIdIn(members)
		);

		expect(firstCodes(people)).toEqual({
			"Calvin Ang": "breaks_rule",
			"Dewi Santoso": "works_another_shift",
			"Elaine Pang": NO_SHIFT_PART_TIME,
		});
	});
});

describe("notAssignedWithLeaveCorrected", () => {
	it("keeps leave the backend agrees with, and reads a working part-timer's 'leave' as no shift that day", () => {
		const people = notAssignedWithLeaveCorrected(
			[said("m-4", ["on_leave"]), said("m-2", ["on_leave"])],
			{
				...COVER,
				unavailable: [
					{ membershipId: "m-4", reason: "ON_LEAVE" },
					{ membershipId: "m-2", reason: "ALREADY_WORKING" },
				],
			},
			profileIdOf
		);

		expect(firstCodes(people)).toEqual({
			"m-4": "on_leave",
			"m-2": NO_SHIFT_PART_TIME,
		});
	});
});
