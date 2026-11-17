import type {
	MemberWeekHours,
	OpeningBalances,
	OpeningMember,
	RosterHours,
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

/** HoursClassifier's worked example: six 12 h shifts against 44 h normal, 28 h of them overtime; Aisha on the roster fixture. */
export const officerWeek = (
	memberProfileId = "mp-1",
	overrides: Partial<MemberWeekHours> = {}
): MemberWeekHours => ({
	memberProfileId,
	daysWorked: 6,
	normalMinutes: 2640,
	extraMinutes: 0,
	overtimeMinutes: 1680,
	...overrides,
});

/** A part-timer on 30 h against their 20 h contract: 10 h extra, none overtime; Ben on the roster fixture. */
export const partTimerWeek = (memberProfileId = "mp-2"): MemberWeekHours => ({
	memberProfileId,
	daysWorked: 5,
	normalMinutes: 1200,
	extraMinutes: 600,
	overtimeMinutes: 0,
});

/** A roster's hours for the week of Monday 30 November 2026, totals added up. */
export const rosterHours = (
	members: Array<MemberWeekHours> = [officerWeek(), partTimerWeek()]
): RosterHours => ({
	weekStart: "2026-11-30",
	weekEnd: "2026-12-06",
	countedFrom: "2026-11-30",
	members,
	totals: {
		daysWorked: members.reduce((sum, member) => sum + member.daysWorked, 0),
		normalMinutes: members.reduce(
			(sum, member) => sum + member.normalMinutes,
			0
		),
		extraMinutes: members.reduce((sum, member) => sum + member.extraMinutes, 0),
		overtimeMinutes: members.reduce(
			(sum, member) => sum + member.overtimeMinutes,
			0
		),
	},
});
