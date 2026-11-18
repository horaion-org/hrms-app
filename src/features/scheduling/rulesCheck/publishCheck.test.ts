import { describe, expect, it } from "vitest";
import {
	ruleFixture,
	rulesCheckFixture,
	staffingGapFixture,
} from "@/features/scheduling/rulesCheck/fixtures";
import {
	type CheckRead,
	gapsOf,
	holdsPublishBack,
	type LocksRead,
	type PublishCheck,
	publishCheckOf,
	violationCountOf,
} from "@/features/scheduling/rulesCheck/publishCheck";

const LOCKS = [
	{ constraintId: "rest-copy", locked: true },
	{ constraintId: "hours-copy", locked: false },
];
const lockedRule = ruleFixture({
	rule: "least_rest_between_shifts",
	constraintId: "rest-copy",
	constraintName: "Rest between shifts",
});
const openRule = ruleFixture({
	rule: "most_minutes_a_day",
	constraintId: "hours-copy",
	constraintName: "Daily hours",
});
const ruleWithoutId = ruleFixture();
const unnamedRule = ruleFixture({ rule: "" });
const broken = (...brokenRules: Array<typeof lockedRule>): CheckRead =>
	rulesCheckFixture({ status: "BROKEN", brokenRules });

describe("publishCheckOf", () => {
	/** Only a broken rule tied to a locked constraint blocks; every unknown allows publishing. */
	it.each<[string, CheckRead, LocksRead, PublishCheck]>([
		["the check still asked", "loading", LOCKS, { kind: "checking" }],
		[
			"the check refused, failed or too slow",
			"unavailable",
			LOCKS,
			{ kind: "unchecked" },
		],
		[
			"the engine unable to check",
			rulesCheckFixture({ status: "UNCHECKED" }),
			LOCKS,
			{ kind: "unchecked" },
		],
		[
			"every rule holding, with one shift short",
			rulesCheckFixture({ staffingGaps: [staffingGapFixture()] }),
			"loading",
			{ kind: "holds", gaps: 1 },
		],
		[
			"every rule holding, the gaps not worked out",
			rulesCheckFixture({ staffingGaps: null }),
			LOCKS,
			{ kind: "holds", gaps: undefined },
		],
		[
			"a rule broken while the constraints are still read",
			broken(lockedRule),
			"loading",
			{ kind: "checking" },
		],
		[
			"a locked and an unlocked rule broken",
			broken(lockedRule, openRule),
			LOCKS,
			{ kind: "broken", locked: [lockedRule], other: [openRule], gaps: 0 },
		],
		[
			"a broken rule with no constraint id",
			broken(ruleWithoutId),
			LOCKS,
			{ kind: "broken", locked: [], other: [ruleWithoutId], gaps: 0 },
		],
		[
			"a broken rule whose constraint is not among those read",
			broken({ ...lockedRule, constraintId: "gone-copy" }),
			LOCKS,
			{
				kind: "broken",
				locked: [],
				other: [{ ...lockedRule, constraintId: "gone-copy" }],
				gaps: 0,
			},
		],
		[
			"a roster broken with no rule named",
			broken(),
			LOCKS,
			{ kind: "broken", locked: [], other: [unnamedRule], gaps: 0 },
		],
		[
			"a rule broken when the constraints could not be read",
			broken(lockedRule),
			"unavailable",
			{ kind: "broken", locked: [], other: [lockedRule], gaps: 0 },
		],
	])("reads %s", (_, check, locks, expected) => {
		expect(publishCheckOf(check, locks)).toEqual(expected);
	});
});

describe("holdsPublishBack", () => {
	it.each<[PublishCheck, boolean]>([
		[{ kind: "checking" }, true],
		[{ kind: "unchecked" }, false],
		[{ kind: "holds", gaps: 2 }, false],
		[{ kind: "broken", locked: [lockedRule], other: [], gaps: 0 }, true],
		[{ kind: "broken", locked: [], other: [openRule], gaps: 0 }, false],
	])("%j holds Publish back: %s", (check, held) => {
		expect(holdsPublishBack(check)).toBe(held);
	});
});

describe("gapsOf", () => {
	it.each<[PublishCheck, number | undefined]>([
		[{ kind: "checking" }, undefined],
		[{ kind: "unchecked" }, undefined],
		[{ kind: "holds", gaps: 2 }, 2],
		[{ kind: "holds", gaps: undefined }, undefined],
		[{ kind: "broken", locked: [], other: [openRule], gaps: 1 }, 1],
	])("%j gives %s", (check, gaps) => {
		expect(gapsOf(check)).toBe(gaps);
	});
});

describe("violationCountOf", () => {
	const violation = { employeeId: "m-1", date: "2026-10-12", messages: [] };

	/** One person on three days counts three; a violation naming no days counts one. */
	it.each([
		["the engine could not say who", null, 0],
		["one person on one day", [violation], 1],
		[
			"one person on three days and another on one",
			[
				{ ...violation, days: ["2026-10-12", "2026-10-13", "2026-10-14"] },
				{ ...violation, employeeId: "m-2" },
			],
			4,
		],
	])("counts %s", (_, violations, expected) => {
		expect(violationCountOf(ruleFixture({ violations }))).toBe(expected);
	});
});
