import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { daysOf } from "@/common/weeks";
import { placeFindings } from "@/features/scheduling/roster/findings/findingsOnGrid";
import {
	rosterFromAssignments,
	type RosterDayNote,
	type RosterRow,
} from "@/features/scheduling/roster/roster";
import {
	daysToDecide,
	leaveAndCoverDays,
} from "@/features/scheduling/roster/rosterSummary";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import {
	generationFindingsFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";
import {
	cellIssues,
	cellMark,
	dayIssueCount,
	dayNoteIssues,
	dayNoteLines,
	issuesOfHeader,
	rowIssueCount,
	saidApartBy,
	showsRole,
	tileStatus,
	tileStatusKey,
	type CellFacts,
	type DayNoteLine,
	type SaidApart,
} from "./rosterMarks";

const WEEK = daysOf("2026-10-12");
const PERIOD = { start: "2026-10-12", end: "2026-10-18" };
/** Ben's row note (m-2), the Saturday conflict and Chen's Sunday message (m-3). */
const placed = placeFindings(generationFindingsFixture(), WEEK);

/** The fixture's week with `changes` laid over the days they name, by assignment id. */
const withDays = (
	changes: Record<string, Partial<ScheduleAssignment>>
): Array<ScheduleAssignment> =>
	scheduleAssignmentsFixture().map((row) => ({
		...row,
		...changes[row.assignmentId],
	}));

const rowOf = (
	assignments: ReadonlyArray<ScheduleAssignment>,
	membershipId: string
): RosterRow => {
	const row = rosterFromAssignments(assignments, PERIOD).find(
		(item) => item.membershipId === membershipId
	);
	if (!row) throw new Error(`fixture has ${membershipId}`);
	return row;
};

/** Aisha's Monday asks for a decision and leaves a shift short; Chen's Tuesday has leave requested. */
const noted = withDays({
	"a-mp-1-2026-10-12": {
		flag: "NEEDS_DECISION",
		uncoveredShift: scheduleAssignmentsFixture()[0]?.shift ?? null,
	},
	"a-mp-3-2026-10-13": { flag: "LEAVE_REQUESTED", leaveRequestId: "r1" },
});

describe("cellMark", () => {
	it.each<[string, CellFacts, ReturnType<typeof cellMark>]>([
		[
			"nothing to say",
			{ issues: 0, changed: false, showsIssues: true },
			undefined,
		],
		["an issue", { issues: 2, changed: false, showsIssues: true }, "issue"],
		[
			"a change by hand",
			{ issues: 0, changed: true, showsIssues: true },
			"changed",
		],
		[
			"both: the issue wins",
			{ issues: 1, changed: true, showsIssues: true },
			"issue",
		],
		[
			"an issue on a member's own roster",
			{ issues: 1, changed: false, showsIssues: false },
			undefined,
		],
		[
			"both on a member's own roster: only the change",
			{ issues: 1, changed: true, showsIssues: false },
			"changed",
		],
	])("given_%s_then_marksIt", (_, facts, mark) => {
		expect(cellMark(facts)).toBe(mark);
	});
});

describe("dayNoteIssues", () => {
	it.each<[string, RosterDayNote | undefined, number]>([
		["no note", undefined, 0],
		["leave requested", { flag: "LEAVE_REQUESTED" }, 1],
		["on leave while rostered", { flag: "ON_LEAVE_WHILE_ROSTERED" }, 1],
		["a shift left short", { uncoveredShiftName: "Morning" }, 1],
		["a day to decide", { flag: "NEEDS_DECISION" }, 1],
		[
			"a day to decide that leaves a shift short, counted in both lists",
			{ flag: "NEEDS_ATTENTION", uncoveredShiftName: "Morning" },
			2,
		],
		["a flag the app does not know", { flag: "UNKNOWN" }, 0],
		["a shift on a rest day, which is no issue", { dayType: "REST" }, 0],
	])("given_%s_then_countsIt", (_, note, count) => {
		expect(dayNoteIssues(note)).toBe(count);
	});
});

describe("dayNoteLines", () => {
	it.each<
		[
			string,
			RosterDayNote | undefined,
			SaidApart | undefined,
			Array<DayNoteLine>,
		]
	>([
		["no note", undefined, undefined, []],
		[
			"leave requested, named and linked",
			{
				flag: "LEAVE_REQUESTED",
				leaveTypeName: "Annual",
				leaveRequestId: "r1",
			},
			undefined,
			[
				{
					kind: "leave",
					key: "leaveRequested",
					leaveTypeName: "Annual",
					leaveRequestId: "r1",
				},
			],
		],
		[
			"leave taken that leaves a shift short",
			{ flag: "ON_LEAVE_WHILE_ROSTERED", uncoveredShiftName: "Morning" },
			undefined,
			[
				{ kind: "leave", key: "onLeave" },
				{ kind: "cover", shiftName: "Morning" },
			],
		],
		[
			"a day needing attention",
			{ flag: "NEEDS_ATTENTION" },
			undefined,
			[{ kind: "decision", key: "needsAttention" }],
		],
		[
			"a day to decide the editor says apart",
			{ flag: "NEEDS_DECISION", uncoveredShiftName: "Morning" },
			new Set(["decision"] as const),
			[{ kind: "cover", shiftName: "Morning" }],
		],
		[
			"leave requested the editor says apart",
			{ flag: "LEAVE_REQUESTED" },
			new Set(["decision", "leaveRequested"] as const),
			[],
		],
		[
			"leave taken, which the editor never says apart",
			{ flag: "ON_LEAVE_WHILE_ROSTERED" },
			new Set(["decision", "leaveRequested"] as const),
			[{ kind: "leave", key: "onLeave" }],
		],
		[
			"a shift on a rest day that leaves another short, the type being no line of its own",
			{ uncoveredShiftName: "Morning", dayType: "REST" },
			undefined,
			[{ kind: "cover", shiftName: "Morning" }],
		],
	])("given_%s_then_readsItsLines", (_, note, saidApart, lines) => {
		expect(dayNoteLines(note, saidApart)).toEqual(lines);
	});
});

describe("saidApartBy", () => {
	it.each<[string, { changesLeave: boolean } | undefined, Array<string>]>([
		["a read-only panel", undefined, []],
		["the day editor", { changesLeave: false }, ["decision"]],
		[
			"the day editor that may change leave",
			{ changesLeave: true },
			["decision", "leaveRequested"],
		],
	])("given_%s_then_leavesOutWhatItSays", (_, editor, lines) => {
		expect([...saidApartBy(editor)]).toEqual(lines);
	});
});

describe("cellIssues", () => {
	it("adds a day's findings and what its note says", () => {
		const chen = rowOf(noted, "m-3");

		expect(cellIssues(placed, chen, "2026-10-18")).toBe(1);
		expect(cellIssues(placed, chen, "2026-10-13")).toBe(1);
		expect(cellIssues(placed, chen, "2026-10-14")).toBe(0);
		expect(cellIssues(placed, rowOf(noted, "m-1"), "2026-10-12")).toBe(2);
	});

	it("counts nothing for a member who no longer resolves", () => {
		const gone = { ...rowOf(noted, "m-3"), membershipId: null };

		expect(cellIssues(placed, gone, "2026-10-18")).toBe(0);
	});
});

describe("rowIssueCount", () => {
	it.each([
		["Ben's row note", "m-2", { count: 1, tone: "attention" }],
		[
			"Chen's Sunday message and Tuesday leave",
			"m-3",
			{ count: 2, tone: "attention" },
		],
		[
			"Aisha's Monday note, in both lists",
			"m-1",
			{ count: 2, tone: "attention" },
		],
	])("given_%s_then_countsEveryIssueInTheRow", (_, membershipId, count) => {
		expect(rowIssueCount(placed, rowOf(noted, membershipId), WEEK)).toEqual(
			count
		);
	});

	it("counts only the days in view", () => {
		expect(
			rowIssueCount(placed, rowOf(noted, "m-3"), ["2026-10-14"])
		).toBeUndefined();
	});

	it("reads information only in the info tone", () => {
		const info = placeFindings(
			generationFindingsFixture({
				errors: [],
				conflicts: [],
				assignmentMessages: [],
				diagnostics: [
					{
						code: "UNASSIGNABLE_EMPLOYEE",
						severity: "info",
						audience: "configuration",
						message: "Ben Ong can only be scheduled off.",
						entities: { employeeId: "mp-2" },
					},
				],
			}),
			WEEK
		);

		expect(rowIssueCount(info, rowOf(noted, "m-2"), WEEK)).toEqual({
			count: 1,
			tone: "info",
		});
	});
});

describe("dayIssueCount", () => {
	it("counts what the engine left about the day as a whole, not a member's cell", () => {
		expect(dayIssueCount(placed, "2026-10-17")).toEqual({
			count: 1,
			tone: "attention",
		});
		expect(dayIssueCount(placed, "2026-10-18")).toBeUndefined();
		expect(dayIssueCount(undefined, "2026-10-17")).toBeUndefined();
	});
});

describe("showsRole", () => {
	it.each<[string, string, string | null, boolean]>([
		[
			"a role that repeats the job title",
			"Front Desk Staff",
			"Front Desk Staff",
			false,
		],
		["a role other than the job title", "Cashier", "Front Desk Staff", true],
		["a member without a job title", "Cashier", null, true],
		["no role", "", "Front Desk Staff", false],
	])("given_%s_then_decidesTheRoleLine", (_, role, jobTitle, shown) => {
		expect(showsRole(role, jobTitle)).toBe(shown);
	});
});

describe("tileStatusKey", () => {
	it.each<[string, RosterDayNote | undefined, boolean, string | undefined]>([
		[
			"own leave requested",
			{ flag: "LEAVE_REQUESTED" },
			false,
			"leaveRequested",
		],
		["own leave taken", { flag: "ON_LEAVE_WHILE_ROSTERED" }, false, "onLeave"],
		[
			"a day to decide on one's own roster",
			{ flag: "NEEDS_DECISION" },
			false,
			undefined,
		],
		[
			"leave requested on a manager's roster",
			{ flag: "LEAVE_REQUESTED" },
			true,
			undefined,
		],
		["no note", undefined, false, undefined],
	])("given_%s_then_readsIt", (_, note, showsIssues, key) => {
		expect(tileStatusKey(note, showsIssues)).toBe(key);
	});
});

describe("tileStatus", () => {
	let t: TFunction;
	beforeAll(async () => {
		const i18n = createInstance();
		await i18n.init({ lng: "en", resources: { en: { translation: en } } });
		t = i18n.t;
	});

	it.each<[string, RosterDayNote | undefined, boolean, string | undefined]>([
		[
			"own leave requested",
			{ flag: "LEAVE_REQUESTED" },
			false,
			"Leave requested",
		],
		[
			"a shift on a rest day, on a manager's roster",
			{ dayType: "REST" },
			true,
			"On rest day",
		],
		[
			"a shift on a day off, on one's own roster",
			{ dayType: "OFF" },
			false,
			"On day off",
		],
		[
			"a shift on a type added later",
			{ dayType: "PUBLIC_HOLIDAY_OFF" },
			true,
			"On public holiday off",
		],
		[
			"own leave requested on a rest day, which leave says first",
			{ flag: "LEAVE_REQUESTED", dayType: "REST" },
			false,
			"Leave requested",
		],
		[
			"leave requested on a manager's roster",
			{ flag: "LEAVE_REQUESTED" },
			true,
			undefined,
		],
		["no note", undefined, false, undefined],
	])("given_%s_then_saysIt", (_, note, showsIssues, status) => {
		expect(tileStatus(note, showsIssues, t)).toBe(status);
	});
});

describe("issuesOfHeader", () => {
	const sources = {
		placed,
		days: WEEK,
		daysToDecide: daysToDecide(noted),
		leaveAndCover: leaveAndCoverDays(noted),
	};

	it("lists a member's findings and their days, exactly as their row counts them", () => {
		const aisha = issuesOfHeader(
			{ kind: "member", membershipId: "m-1" },
			sources
		);
		const chen = issuesOfHeader(
			{ kind: "member", membershipId: "m-3" },
			sources
		);

		expect(aisha.findings).toEqual([]);
		expect(aisha.daysToDecide.map((row) => row.assignmentId)).toEqual([
			"a-mp-1-2026-10-12",
		]);
		expect(aisha.leaveAndCover.map((row) => row.assignmentId)).toEqual([
			"a-mp-1-2026-10-12",
		]);
		expect(chen.findings).toEqual([
			{
				kind: "message",
				date: "2026-10-18",
				message: "Chen Wei covers the Sunday swing alone.",
			},
		]);
		expect(chen.leaveAndCover.map((row) => row.assignmentId)).toEqual([
			"a-mp-3-2026-10-13",
		]);
	});

	it("leaves out a member's days outside the week in view", () => {
		expect(
			issuesOfHeader(
				{ kind: "member", membershipId: "m-3" },
				{ ...sources, days: ["2026-10-14"] }
			)
		).toEqual({ findings: [], daysToDecide: [], leaveAndCover: [] });
	});

	it("lists a day's own findings and no member's days", () => {
		const saturday = issuesOfHeader(
			{ kind: "date", date: "2026-10-17" },
			sources
		);

		expect(saturday.findings).toHaveLength(1);
		expect(saturday.findings[0]?.kind).toBe("conflict");
		expect(saturday.daysToDecide).toEqual([]);
		expect(saturday.leaveAndCover).toEqual([]);
	});
});
