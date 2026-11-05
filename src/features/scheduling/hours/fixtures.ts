import type {
	OpeningBalances,
	OpeningMember,
} from "@/features/scheduling/hours/api";

/** A member whose opening may be set: nothing entered yet. */
export const editableMember = (
	memberProfileId = "p-aisha",
	overrides: Partial<OpeningMember> = {}
): OpeningMember => ({
	memberProfileId,
	workedMinutes: null,
	overtimeMinutes: null,
	enteredAsOf: null,
	rosteredBefore: false,
	editable: true,
	...overrides,
});

/** The openings of a roster starting Monday 9 November 2026: 1–8 November come before it. */
export const midMonthOpenings = (
	members: Array<OpeningMember> = [editableMember()]
): OpeningBalances => ({
	monthStart: "2026-11-01",
	asOf: "2026-11-09",
	applies: true,
	members,
});
