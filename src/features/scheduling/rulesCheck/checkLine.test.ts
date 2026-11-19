import { describe, expect, it, vi } from "vitest";
import { checkLineOf, type CheckLine } from "@/features/scheduling/rulesCheck/checkLine";
import { rulesCheckFixture } from "@/features/scheduling/rulesCheck/fixtures";
import type { ValidationStanding } from "@/features/scheduling/rulesCheck/issuesFromValidation";
import type { RosterValidation } from "@/features/scheduling/rulesCheck/useRosterRulesCheck";

const CHECKED_AT = 1_795_075_436_135;

/** A check's state at revision 1, its last answer at `lastRevision` when given. */
const validationOf = (
	state: Pick<RosterValidation, "status"> & Partial<RosterValidation>,
	lastRevision?: number,
	check = rulesCheckFixture()
): RosterValidation =>
	({
		ask: vi.fn(),
		revision: 1,
		last:
			lastRevision === undefined
				? undefined
				: { revision: lastRevision, check, checkedAt: CHECKED_AT },
		...state,
	}) as RosterValidation;

describe("checkLineOf", () => {
	it.each<[string, ValidationStanding, RosterValidation, CheckLine]>([
		["a check running", "current", validationOf({ status: "loading" }), { state: "checking" }],
		[
			"a refusal a retry may mend",
			"current",
			validationOf({ status: "refused", refusal: "tooSlow" }),
			{ state: "refused", refusal: "tooSlow", canRetry: true },
		],
		[
			"a refusal for good",
			"current",
			validationOf({ status: "refused", refusal: "expired" }),
			{ state: "refused", refusal: "expired", canRetry: false },
		],
		[
			"hand changes nothing checked",
			"outOfDate",
			validationOf({ status: "idle" }),
			{ state: "unchecked" },
		],
		[
			"a check of an earlier revision",
			"outOfDate",
			validationOf({ status: "idle" }, 0),
			{ state: "unchecked" },
		],
		[
			"a check at the revision on screen",
			"current",
			validationOf({ status: "idle" }, 1),
			{ state: "checked", checkedAt: CHECKED_AT, incomplete: false },
		],
		[
			"a check the engine ran out of time on",
			"current",
			validationOf({ status: "idle" }, 1, rulesCheckFixture({ mayBeShort: true })),
			{ state: "checked", checkedAt: CHECKED_AT, incomplete: true },
		],
		[
			"a check that could not work out the staffing",
			"current",
			validationOf({ status: "idle" }, 1, rulesCheckFixture({ staffingGaps: null })),
			{ state: "checked", checkedAt: CHECKED_AT, incomplete: true },
		],
		[
			"a roster never changed nor checked",
			"asGenerated",
			validationOf({ status: "idle" }),
			{ state: "asGenerated" },
		],
	])("for %s", (_case, standing, validation, line) => {
		expect(checkLineOf(standing, validation)).toEqual(line);
	});

	it("says nothing to someone who may not run the check", () => {
		expect(checkLineOf("current", undefined)).toBeUndefined();
	});
});
