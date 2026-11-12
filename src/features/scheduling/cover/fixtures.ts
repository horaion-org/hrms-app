import type {
	CoverOption,
	CoverOptions,
} from "@/features/scheduling/cover/api";
import { shiftCopyId } from "@/features/scheduling/shifts/fixtures";

/*
 * API-shaped Find cover answers for stories and tests; never sent anywhere.
 * Schedule s-1's Front Desk AM is one short on Saturday 17 October (the
 * generation's hole in `schedules/fixtures.ts`): Aisha Rahman (m-1), off that
 * day, is free within her contracted hours, Chen Wei (m-3) would work it as
 * overtime, and Ben Ong (m-2) already works that day.
 */

const FRONT_DESK_AM = shiftCopyId("front-desk-am");
const SATURDAY = "2026-10-17";

/** One option: Aisha, off that day and within her hours; `overrides` set it apart. */
export const coverOptionFixture = (
	overrides: Partial<CoverOption> = {}
): CoverOption => {
	const membershipId = overrides.membershipId ?? "m-1";
	return {
		membershipId,
		kind: "FREE",
		cells: [
			{ membershipId, day: SATURDAY, kind: "WORK", shiftId: FRONT_DESK_AM },
		],
		pay: { normalMinutes: 360, extraMinutes: 0, overtimeMinutes: 0 },
		weekMinutes: { before: 1440, after: 1800, contract: 2640 },
		monthOvertimeMinutes: { before: 0, after: 0 },
		neighbours: [{ day: "2026-10-16", shiftId: FRONT_DESK_AM }],
		warnings: [],
		...overrides,
	};
};

/** The answer for Saturday's Front Desk AM at revision 1; `overrides` set it apart. */
export const coverOptionsFixture = (
	overrides: Partial<CoverOptions> = {}
): CoverOptions => ({
	revision: 1,
	gap: {
		shiftId: FRONT_DESK_AM,
		day: SATURDAY,
		shortBy: 1,
		shortSinceGeneration: 1,
		absentMembershipIds: [],
	},
	options: [
		coverOptionFixture(),
		coverOptionFixture({
			membershipId: "m-3",
			kind: "OVERTIME",
			pay: { normalMinutes: 0, extraMinutes: 0, overtimeMinutes: 360 },
			weekMinutes: { before: 2640, after: 3000, contract: 2640 },
			monthOvertimeMinutes: { before: 1080, after: 1440 },
			neighbours: [],
			warnings: ["ROSTERED_ELSEWHERE"],
		}),
	],
	unavailable: [{ membershipId: "m-2", reason: "ALREADY_WORKING" }],
	ruleCheck: "NOT_CHECKED",
	...overrides,
});
