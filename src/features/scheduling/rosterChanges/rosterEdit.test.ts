import { describe, expect, it } from "vitest";
import {
	rosterChangeFixture,
	rosterCheckFixture,
} from "@/features/scheduling/rosterChanges/fixtures";
import {
	applyGate,
	canApply,
	cellsForChoice,
	dayTypeChoices,
	notWorkingWording,
	patchRoster,
	peopleTold,
	preselectedDayType,
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
const SUNDAY = "2026-10-18";

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

	it("given_aTypeForTheDayNotWorked_when_chosen_then_theCellNamesIt", () => {
		expect(
			cellsForChoice(dayOf("m-1", MONDAY), { kind: "dayOff", dayType: "REST" })
		).toEqual([
			{ membershipId: "m-1", day: MONDAY, kind: "OFF", dayType: "REST" },
		]);
	});

	it("given_noType_when_notWorkingIsChosen_then_theCellLeavesTheTypeOut", () => {
		const [cell] = cellsForChoice(dayOf("m-2", MONDAY), { kind: "dayOff" });

		expect(cell).not.toHaveProperty("dayType");
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

describe("dayTypeChoices", () => {
	const TYPES = ["OFF", "REST", "PUBLIC_HOLIDAY_OFF"];

	it("given_aWorkedDay_when_listed_then_everyType", () => {
		expect(dayTypeChoices(TYPES, dayOf("m-1", MONDAY))).toEqual(TYPES);
	});

	it("given_aRestDay_when_listed_then_everyTypeButItsOwn", () => {
		expect(dayTypeChoices(TYPES, dayOf("m-1", SUNDAY))).toEqual([
			"OFF",
			"PUBLIC_HOLIDAY_OFF",
		]);
	});

	it("given_aDayToDecide_when_listed_then_everyTypeSoItsOwnCanBeConfirmed", () => {
		const toDecide: ScheduleAssignment = {
			...dayOf("m-1", SUNDAY),
			flag: "NEEDS_DECISION",
		};

		expect(dayTypeChoices(TYPES, toDecide)).toEqual(TYPES);
	});

	it("given_aPartTimer_when_listed_then_none", () => {
		expect(dayTypeChoices(TYPES, dayOf("m-2", MONDAY))).toEqual([]);
	});

	it("given_aPartTimersDayToDecide_when_listed_then_none", () => {
		const toDecide: ScheduleAssignment = {
			...dayOf("m-2", SUNDAY),
			flag: "NEEDS_DECISION",
		};

		expect(dayTypeChoices(TYPES, toDecide)).toEqual([]);
	});

	it("given_anOlderApi_when_listed_then_none", () => {
		expect(dayTypeChoices([], dayOf("m-1", MONDAY))).toEqual([]);
	});
});

describe("preselectedDayType", () => {
	it("given_theDaysOwnTypeOffered_when_picked_then_itsOwn", () => {
		expect(preselectedDayType(["OFF", "REST"], "REST")).toBe("REST");
	});

	it("given_noTypeOrOneNotOffered_when_picked_then_theFirst", () => {
		expect(preselectedDayType(["OFF", "REST"], null)).toBe("OFF");
		expect(preselectedDayType(["OFF"], "REST")).toBe("OFF");
	});

	it("given_nothingOffered_when_picked_then_none", () => {
		expect(preselectedDayType([], "REST")).toBeUndefined();
	});
});

describe("notWorkingWording", () => {
	it.each<[string, ScheduleAssignment, boolean, string]>([
		["a worked day", dayOf("m-1", MONDAY), false, "notWorking"],
		["a part-timer's worked day", dayOf("m-2", MONDAY), false, "removeShift"],
		["a day already not worked", dayOf("m-1", SUNDAY), false, "anotherDayType"],
		[
			"a day to decide",
			{ ...dayOf("m-1", SUNDAY), flag: "NEEDS_DECISION" },
			false,
			"confirmDayOff",
		],
		[
			"a part-timer's day to decide",
			{ ...dayOf("m-2", SUNDAY), flag: "NEEDS_DECISION" },
			false,
			"confirmNoShift",
		],
		["a leave day going back", dayOf("m-2", WEDNESDAY), true, "notWorking"],
	])("given_%s", (_, assignment, leaveDayEditable, wording) => {
		expect(notWorkingWording(assignment, leaveDayEditable)).toBe(wording);
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

describe("peopleTold", () => {
	it("given_aSwapAndADayOfAFormerMember_when_counted_then_eachMemberOnceAndNoFormerMember", () => {
		expect(
			peopleTold([
				{ membershipId: "m-1" },
				{ membershipId: "m-2" },
				{ membershipId: "m-1" },
				{ membershipId: null },
			])
		).toBe(2);
	});
});
