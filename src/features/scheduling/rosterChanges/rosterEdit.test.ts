import { describe, expect, it } from "vitest";
import {
	rosterChangeFixture,
	rosterCheckFixture,
} from "@/features/scheduling/rosterChanges/fixtures";
import {
	applyGate,
	canApply,
	cellsForChoice,
	patchRoster,
	rosterCellKey,
	rosteredJobTitleId,
	shiftChoices,
	swapPartners,
} from "@/features/scheduling/rosterChanges/rosterEdit";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";

const roster = scheduleAssignmentsFixture();
const dayOf = (membershipId: string, day: string): ScheduleAssignment =>
	roster.find(
		(row) => row.member?.membershipId === membershipId && row.day === day
	)!;
const MONDAY = "2026-10-12";
const WEDNESDAY = "2026-10-14";
const SATURDAY = "2026-10-17";

describe("cellsForChoice", () => {
	it("given_aShiftOrADayOff_when_chosen_then_oneCellForTheDay", () => {
		const aisha = dayOf("m-1", MONDAY);

		expect(
			cellsForChoice(aisha, { kind: "shift", shiftId: "lunch-rush-copy" })
		).toEqual([
			{
				membershipId: "m-1",
				day: MONDAY,
				kind: "WORK",
				shiftId: "lunch-rush-copy",
			},
		]);
		expect(cellsForChoice(aisha, { kind: "dayOff" })).toEqual([
			{ membershipId: "m-1", day: MONDAY, kind: "OFF" },
		]);
	});

	it("given_aSwapOfAShiftAndADayOff_when_chosen_then_eachDayTakesWhatTheOtherHeld", () => {
		const aishaSaturdayOff = dayOf("m-1", SATURDAY);
		const chenSaturday = dayOf("m-3", SATURDAY);

		expect(
			cellsForChoice(aishaSaturdayOff, { kind: "swap", partner: chenSaturday })
		).toEqual([
			{
				membershipId: "m-1",
				day: SATURDAY,
				kind: "WORK",
				shiftId: "swing-shift-copy",
			},
			{ membershipId: "m-3", day: SATURDAY, kind: "OFF" },
		]);
	});

	it("given_noChoiceYet_when_asked_then_noCells", () => {
		expect(cellsForChoice(dayOf("m-1", MONDAY), undefined)).toEqual([]);
	});
});

describe("shiftChoices", () => {
	it("given_aKnownJobTitle_when_listed_then_onlyShiftsRunningThatDayOpenToItWithoutTheCurrentOne", () => {
		const jobTitleId = rosteredJobTitleId(roster, "m-1");
		const choices = shiftChoices(
			frozenShiftsFixture(),
			MONDAY,
			jobTitleId,
			"front-desk-am-copy"
		);

		expect(jobTitleId).toBe("front-desk-lead");
		expect(choices.map(({ shiftId }) => shiftId)).not.toContain(
			"front-desk-am-copy"
		);
		expect(
			choices.every(
				({ days, roles }) =>
					days.includes("MON") &&
					roles.some((role) => role.jobTitleId === jobTitleId)
			)
		).toBe(true);
	});

	it("given_aJobTitleNoOtherShiftIsOpenTo_when_listed_then_none", () => {
		expect(
			shiftChoices(
				frozenShiftsFixture(),
				MONDAY,
				"front-desk-staff",
				"front-desk-am-copy"
			)
		).toEqual([]);
	});

	it("given_aMemberWhoWorksNoDay_when_listed_then_everyShiftRunningThatDay", () => {
		const choices = shiftChoices(
			frozenShiftsFixture(),
			SATURDAY,
			null,
			undefined
		);

		expect(choices.length).toBeGreaterThan(1);
		expect(choices.every(({ days }) => days.includes("SAT"))).toBe(true);
	});
});

describe("swapPartners", () => {
	it("given_aWorkingDay_when_partnersAreListed_then_leaveIsSetApartWithoutSayingWhy", () => {
		const partners = swapPartners(roster, dayOf("m-1", WEDNESDAY));

		expect(partners.available.map((row) => row.member?.membershipId)).toEqual([
			"m-3",
		]);
		expect(partners.unavailable.map((row) => row.member?.membershipId)).toEqual(
			["m-2"]
		);
	});

	it("given_aDayOff_when_partnersAreListed_then_onlyThoseWhoWork", () => {
		const partners = swapPartners(roster, dayOf("m-1", SATURDAY));

		expect(partners.available.every((row) => row.shift !== null)).toBe(true);
	});
});

describe("applyGate and canApply", () => {
	it.each([
		["information only", "INFO", false, "", true],
		["a warning without the tick", "NEEDS_ACKNOWLEDGEMENT", false, "", false],
		["a warning with the tick", "NEEDS_ACKNOWLEDGEMENT", true, "", true],
		["a remark asked, ticked but blank", "NEEDS_REMARK", true, "  ", false],
		[
			"a remark asked, ticked and written",
			"NEEDS_REMARK",
			true,
			"Asked to cover",
			true,
		],
		["a refusal", "REFUSED", true, "Anything", false],
	] as const)(
		"given_%s_when_read_then_applyIs %s",
		(_, severity, ticked, remark, allowed) => {
			const gate = applyGate([rosterCheckFixture({ severity })]);

			expect(canApply(gate, ticked, remark)).toBe(allowed);
		}
	);
});

describe("patchRoster", () => {
	it("given_changedRows_when_patched_then_theyReplaceTheirOldSelvesInPlace", () => {
		const changed = {
			...dayOf("m-1", MONDAY),
			shift: null,
			off: true,
			offReason: "OFF" as const,
		};

		const patched = patchRoster(
			roster,
			rosterChangeFixture({ assignments: [changed] }).assignments
		);

		expect(patched).toHaveLength(roster.length);
		expect(patched[0]).toBe(changed);
		expect(patched[1]).toBe(roster[1]);
	});
});

describe("rosterCellKey", () => {
	it("given_aMemberAndDay_when_keyed_then_oneStableKey", () => {
		expect(rosterCellKey("m-1", MONDAY)).toBe("m-1|2026-10-12");
	});
});
