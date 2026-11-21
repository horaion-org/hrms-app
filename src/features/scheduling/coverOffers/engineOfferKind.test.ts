import { describe, expect, it } from "vitest";
import {
	callInOption,
	daySwapOption,
	moveOption,
	otherTwoPeopleOption,
	restDayCallInOption,
	stretchAfterOption,
	stretchPairOption,
} from "@/features/scheduling/cover/engineRepairFixtures";
import {
	engineOfferTargetOf,
	offerKindOfOption,
} from "@/features/scheduling/coverOffers/engineOfferKind";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";

const working = { shift: scheduleAssignmentsFixture()[0]!.shift };

describe("offerKindOfOption", () => {
	it.each([
		["a call-in on a day off", callInOption(), "OFF_DAY_SHIFT"],
		["a call-in with rest-day hours", restDayCallInOption(), "REST_DAY_SHIFT"],
		["a move", moveOption(), "MOVE"],
		["a stretch", stretchAfterOption(), "STRETCH"],
		["a day swap", daySwapOption(), "DAY_SWAP"],
		["a stretch pair, two people", stretchPairOption(), undefined],
		["the older repair's two people", otherTwoPeopleOption(), undefined],
	])("sends %s as %s", (_case, option, kind) => {
		expect(offerKindOfOption(option, undefined)).toBe(kind);
	});

	it("reads one of the older repair's one-person changes as the cell panel does", () => {
		const one = {
			...otherTwoPeopleOption(),
			people: [moveOption().people[0]!],
		};

		expect(offerKindOfOption(one, { shift: null })).toBe("OFF_DAY_SHIFT");
		expect(offerKindOfOption(one, working)).toBe("MOVE");
	});
});

describe("engineOfferTargetOf", () => {
	it("asks the member about the day their option adds work, on that shift, as its kind", () => {
		const target = engineOfferTargetOf(
			stretchAfterOption(),
			scheduleAssignmentsFixture()
		);

		expect(target).toMatchObject({
			assignment: { day: "2026-10-17", member: { membershipId: "m-2" } },
			choice: { kind: "shift", shiftId: "lunch-rush-copy" },
			offerKind: "STRETCH",
		});
	});

	it("asks nobody about a change of two people", () => {
		expect(
			engineOfferTargetOf(stretchPairOption(), scheduleAssignmentsFixture())
		).toBeUndefined();
	});
});
