import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ApiProblemError } from "@/common/problem";
import {
	callInMove,
	feasibleRepair,
	infeasibleRepair,
	partStretchRepair,
	reassignMove,
	stretchMove,
} from "@/features/scheduling/cover/engineRepairFixtures";
import {
	clockTime,
	leftShortLine,
	leftShortNextLine,
	moveLine,
	optionHeadingKey,
	stillShortAfterApplying,
	optionsInOrder,
	repairRefusalOf,
	type RepairNames,
} from "@/features/scheduling/cover/engineRepairWords";

let t: TFunction;

beforeAll(async () => {
	const i18n = createInstance();
	await i18n.init({ lng: "en", resources: { en: { translation: en } } });
	t = i18n.t;
});

const names: RepairNames = {
	member: (membershipId) => `Member ${membershipId}`,
	day: (isoDate) => (isoDate === "2026-10-17" ? "Sat, Oct 17" : isoDate),
	hours: (minutes) => String(minutes / 60),
};

/** A refusal as the API client raises it. */
const problem = (errorCode: string): ApiProblemError =>
	new ApiProblemError({
		message: "Refused",
		status: 409,
		errorCode,
		fieldErrors: [],
		reason: "http",
	});

describe("moveLine", () => {
	it("words each kind of move", () => {
		expect(moveLine(reassignMove(), names, t)).toBe(
			"Move Ben Ong from Swing Shift Sat, Oct 17 to Front Desk AM Sat, Oct 17"
		);
		expect(moveLine(callInMove(), names, t)).toBe(
			"Call in Aisha Rahman for Front Desk AM Sat, Oct 17"
		);
		expect(moveLine(stretchMove(), names, t)).toBe(
			"Chen Wei stays on after Swing Shift until 15:00 (+2 h)"
		);
		expect(
			moveLine(
				stretchMove({
					side: "BEFORE_SHIFT",
					period: { start: "2026-10-17T07:00:00", end: "2026-10-17T09:00:00" },
				}),
				names,
				t
			)
		).toBe("Chen Wei starts Swing Shift early at 07:00 (+2 h)");
		expect(moveLine(stretchMove({ side: null }), names, t)).toBe(
			"Extend Chen Wei’s Swing Shift by 2 h"
		);
		expect(moveLine({ ...callInMove(), kind: "UNKNOWN" }, names, t)).toBe(
			"A change the app can’t describe yet"
		);
	});

	it("names someone the roster no longer names as a former member", () => {
		expect(
			moveLine(callInMove({ membershipId: null, displayName: null }), names, t)
		).toBe("Call in Former member for Front Desk AM Sat, Oct 17");
	});
});

describe("leftShortLine", () => {
	it("says what an option still leaves short, and nothing when it fills the gap", () => {
		expect(leftShortLine(infeasibleRepair(), t)).toBe(
			"Still 1 short 09:00 – 15:00"
		);
		expect(leftShortLine(feasibleRepair(), t)).toBeUndefined();
	});
});

describe("optionHeadingKey", () => {
	it("heads a full fill, a part fill and the engine's honest no apart", () => {
		expect(optionHeadingKey(feasibleRepair())).toBe("fills");
		expect(optionHeadingKey(partStretchRepair())).toBe("fillsPart");
		expect(optionHeadingKey(infeasibleRepair())).toBe("cannotFill");
	});
});

describe("leftShortNextLine", () => {
	it("says to find cover again only for an option that leaves hours short", () => {
		expect(leftShortNextLine(partStretchRepair(), t)).toBe(
			"After applying it, find cover again for the hours still short."
		);
		expect(leftShortNextLine(feasibleRepair(), t)).toBeUndefined();
		expect(leftShortNextLine(infeasibleRepair(), t)).toBeUndefined();
	});
});

describe("stillShortAfterApplying", () => {
	const gap = { shift: "Front Desk AM", day: "Sat, Oct 17" };

	it("says which hours an applied option leaves short, and to find cover again", () => {
		expect(stillShortAfterApplying(partStretchRepair(), gap, t)).toBe(
			"Roster changed. Front Desk AM on Sat, Oct 17 is still 1 short 09:00 – 13:00: find cover again for those hours."
		);
	});

	it("says nothing more for an option that fills the gap", () => {
		expect(stillShortAfterApplying(feasibleRepair(), gap, t)).toBeUndefined();
	});
});

describe("optionsInOrder", () => {
	it("puts feasible options first, keeping the engine's order inside each", () => {
		const no = infeasibleRepair();
		const yes = feasibleRepair();
		expect(optionsInOrder([no, yes])).toEqual([yes, no]);
	});
});

describe("repairRefusalOf", () => {
	it.each([
		["REPAIR_GAP_NOT_SEEN_BY_ENGINE", "notSeenByEngine"],
		["REPAIR_GAP_EXPIRED", "expired"],
		["REPAIR_NO_ENGINE_JOB", "expired"],
		["REPAIR_ENGINE_NOT_CONFIGURED", "notConnected"],
		["ROSTER_REVISION_CONFLICT", "rosterMoved"],
		["REPAIR_ENGINE_TOO_SLOW", "tooSlow"],
		["REPAIR_ENGINE_FAILED", "failed"],
	] as const)("reads %s as %s", (code, refusal) => {
		expect(repairRefusalOf(problem(code))).toBe(refusal);
	});

	it("reads anything else as the engine failing", () => {
		expect(repairRefusalOf(new Error("offline"))).toBe("failed");
	});
});

describe("clockTime", () => {
	it("keeps a local date-time's clock time, and nothing for an unknown one", () => {
		expect(clockTime("2026-10-17T09:00:00")).toBe("09:00");
		expect(clockTime(null)).toBe("");
	});
});
