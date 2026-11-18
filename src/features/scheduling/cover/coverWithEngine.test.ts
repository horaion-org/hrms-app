import { describe, expect, it } from "vitest";
import type { NotAssignedPerson } from "@/features/scheduling/cover/engineRepairApi";
import {
	callInMove,
	feasibleRepair,
	partStretchRepair,
} from "@/features/scheduling/cover/engineRepairFixtures";
import { coverOptionsFixture } from "@/features/scheduling/cover/fixtures";
import {
	coverWithEngine,
	NO_SHIFT_PART_TIME,
} from "@/features/scheduling/cover/coverWithEngine";
import {
	frontDeskSundayLateCase,
	profileIdIn,
	ruleLabCase,
} from "@/features/scheduling/cover/coverWithEngineFixtures";

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

describe("coverWithEngine: the two recorded contradictions", () => {
	it("Rule Lab I1: the Assistant the engine calls in comes first and is the one suggested, ahead of the Supervisors", () => {
		const { members, cover, engine } = ruleLabCase();

		const merged = coverWithEngine(cover, engine, profileIdIn(members));

		expect(merged.order).toBe("engineFirst");
		expect(merged.options.map((option) => option.membershipId)).toEqual([
			"m-tamsin",
			"m-orla",
			"m-piet",
		]);
		expect(merged.suggested).toBe("m-tamsin");
		expect(merged.engineNote).toEqual({
			"m-tamsin": "fills",
			"m-orla": "notConsidered",
			"m-piet": "notConsidered",
		});
		// Nobody is demoted: "Can't help" is the backend's own.
		expect(merged.unavailable).toEqual(cover.unavailable);
		// Viktor is not on leave: the backend says he is not available then.
		expect(firstCodes(merged.notAssigned)).toMatchObject({
			"Viktor Nakamura": "outside_availability",
			"Soren Mbeki": "works_another_shift",
		});
	});

	it("Front Desk Sunday Late: the person the engine refuses for rest moves under Can't help, and nobody is suggested", () => {
		const { members, cover, engine } = frontDeskSundayLateCase();

		const merged = coverWithEngine(cover, engine, profileIdIn(members));

		expect(merged.options.map((option) => option.membershipId)).toEqual([
			"m-elaine",
			"m-fikri",
		]);
		expect(merged.suggested).toBeUndefined();
		expect(merged.engineNote).toEqual({
			"m-elaine": "partTimeNoShift",
			"m-fikri": "notConsidered",
		});
		expect(merged.unavailable).toMatchObject([
			{
				membershipId: "m-calvin",
				engineReason: {
					code: "breaks_rule",
					constraintName: "Rest between shifts",
				},
			},
			...cover.unavailable,
		]);
		// Elaine is a part-timer with no shift that day, which the engine is sent as leave.
		expect(firstCodes(merged.notAssigned)).toEqual({
			"Calvin Ang": "breaks_rule",
			"Dewi Santoso": "works_another_shift",
			"Elaine Pang": NO_SHIFT_PART_TIME,
		});
	});
});

describe("coverWithEngine: the guards", () => {
	it.each([
		["the engine has not answered", undefined],
		[
			"the engine cannot say why people were not assigned",
			{ options: [feasibleRepair()], notAssigned: null },
		],
		["an older API sends no reasons at all", { options: [feasibleRepair()] }],
	])(
		"leaves the backend's list unchanged with nobody suggested when %s",
		(_when, engine) => {
			expect(coverWithEngine(COVER, engine, profileIdOf)).toEqual({
				order: "byExtraHours",
				options: COVER.options,
				suggested: undefined,
				engineNote: {},
				unavailable: COVER.unavailable,
				notAssigned: null,
			});
		}
	);

	it.each([
		["could take it", said("m-3", [], true), "couldTake", "m-3"],
		[
			"could take it only as overtime",
			said("m-3", ["needs_overtime"]),
			"couldTake",
			"m-3",
		],
		[
			"was not checked in time",
			said("m-3", ["not_checked"]),
			"notCheckedInTime",
			undefined,
		],
	])("keeps someone the engine says %s", (_what, person, note, suggested) => {
		const merged = coverWithEngine(
			COVER,
			{ options: [], notAssigned: [person] },
			profileIdOf
		);

		expect(merged.engineNote["m-3"]).toBe(note);
		expect(merged.suggested).toBe(suggested);
		expect(merged.unavailable).toEqual(COVER.unavailable);
	});

	it("puts someone who could take the shift ahead of people the engine never looked at", () => {
		const merged = coverWithEngine(
			COVER,
			{ options: [], notAssigned: [said("m-3", [], true)] },
			profileIdOf
		);

		expect(merged.options.map((option) => option.membershipId)).toEqual([
			"m-3",
			"m-1",
		]);
	});

	it.each([
		["a reason code the app does not know", ["on_training"], "on_training"],
		["no reason at all", [], "no_reason_given"],
	])("demotes someone the engine refuses with %s", (_what, codes, code) => {
		const merged = coverWithEngine(
			COVER,
			{ options: [], notAssigned: [said("m-1", codes)] },
			profileIdOf
		);

		expect(merged.options.map((option) => option.membershipId)).toEqual([
			"m-3",
		]);
		expect(merged.unavailable[0]).toMatchObject({
			membershipId: "m-1",
			engineReason: { code },
		});
	});

	it("demotes a refused person even when an engine option calls them in", () => {
		const merged = coverWithEngine(
			COVER,
			{
				options: [feasibleRepair([callInMove()])],
				notAssigned: [said("m-1", ["breaks_rule"])],
			},
			profileIdOf
		);

		expect(merged.suggested).toBeUndefined();
		expect(merged.options.map((option) => option.membershipId)).toEqual([
			"m-3",
		]);
	});

	it.each([
		["leaves hours short", partStretchRepair()],
		[
			"calls the person in to another shift",
			feasibleRepair([callInMove({ shiftId: "another-shift" })]),
		],
		[
			"calls the person in on another day",
			feasibleRepair([callInMove({ date: "2026-10-18" })]),
		],
	])("suggests nobody for an engine option that %s", (_what, option) => {
		const merged = coverWithEngine(
			COVER,
			{ options: [option], notAssigned: [] },
			profileIdOf
		);

		expect(merged.suggested).toBeUndefined();
		expect(merged.engineNote).toEqual({
			"m-1": "notConsidered",
			"m-3": "notConsidered",
		});
	});

	it.each([
		["also says leave", "ON_LEAVE", "on_leave"],
		["hides leave from this viewer", "NOT_AVAILABLE", "on_leave"],
		["says not available then", "OUTSIDE_AVAILABILITY", "outside_availability"],
		["gives another reason", "ALREADY_WORKING", NO_SHIFT_PART_TIME],
	] as const)(
		"words the engine's on leave by the backend, which %s",
		(_what, backendReason, code) => {
			const cover = coverOptionsFixture({
				unavailable: [{ membershipId: "m-2", reason: backendReason }],
			});

			const merged = coverWithEngine(
				cover,
				{ options: [], notAssigned: [said("m-2", ["on_leave"])] },
				profileIdOf
			);

			expect(firstCodes(merged.notAssigned)).toEqual({ "m-2": code });
		}
	);

	it("keeps the engine's on leave for someone the backend does not list", () => {
		const merged = coverWithEngine(
			COVER,
			{ options: [], notAssigned: [said("m-9", ["on_leave"])] },
			profileIdOf
		);

		expect(firstCodes(merged.notAssigned)).toEqual({ "m-9": "on_leave" });
	});
});
