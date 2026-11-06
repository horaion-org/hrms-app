import type {
	RosterChange,
	RosterChangePreview,
	RosterCheck,
} from "@/features/scheduling/rosterChanges/api";
import type {
	RosterCellValue,
	ScheduleAssignment,
} from "@/features/scheduling/schedules/api";

/*
 * API-shaped roster changes for stories and tests; never sent anywhere. They
 * describe schedule s-1's roster (`schedules/fixtures.ts`): Aisha Rahman
 * (m-1) works Front Desk AM on Monday 12 October.
 */

const FRONT_DESK_AM: RosterCellValue = {
	kind: "WORK",
	shift: {
		shiftId: "front-desk-am-copy",
		name: "Front Desk AM",
		group: "Front Desk",
		colour: "#E9A55A",
		startTime: "09:00",
		endTime: "15:00",
	},
	jobTitle: { jobTitleId: "front-desk-lead", name: "Front Desk Lead" },
};

const DAY_OFF: RosterCellValue = { kind: "OFF", shift: null, jobTitle: null };

/** A check; `overrides` set it apart. */
export const rosterCheckFixture = (
	overrides: Partial<RosterCheck> = {}
): RosterCheck => ({
	code: "COVERAGE_CHANGED",
	severity: "INFO",
	membershipId: null,
	day: "2026-10-12",
	shiftId: "front-desk-am-copy",
	countBefore: 2,
	countAfter: 1,
	...overrides,
});

/** A preview of making Aisha's Monday a day off at revision 1; `overrides` set it apart. */
export const rosterChangePreviewFixture = (
	overrides: Partial<RosterChangePreview> = {}
): RosterChangePreview => ({
	expectedRevision: 1,
	cells: [
		{
			membershipId: "m-1",
			displayName: "Aisha Rahman",
			day: "2026-10-12",
			before: FRONT_DESK_AM,
			after: DAY_OFF,
		},
	],
	checks: [rosterCheckFixture()],
	refused: false,
	needsAcknowledgement: false,
	needsRemark: false,
	checksFingerprint: null,
	ruleCheck: "NOT_CHECKED",
	...overrides,
});

/** Aisha's Monday as a day off, changed by José. */
export const editedAssignmentFixture = (
	assignment: ScheduleAssignment
): ScheduleAssignment => ({
	...assignment,
	off: true,
	offReason: "OFF",
	shift: null,
	jobTitle: null,
	lastChange: {
		changeId: "rc-1",
		appliedAt: "2026-10-10T08:00:00Z",
		appliedBy: { membershipId: "m-c-1", displayName: "José" },
		remark: null,
		before: FRONT_DESK_AM,
	},
});

/** The edit that made Aisha's Monday a day off, from revision 1 to 2; `overrides` set it apart. */
export const rosterChangeFixture = (
	overrides: Partial<RosterChange> = {}
): RosterChange => ({
	changeId: "rc-1",
	kind: "EDIT",
	fromRevision: 1,
	toRevision: 2,
	appliedAt: "2026-10-10T08:00:00Z",
	appliedBy: { membershipId: "m-c-1", displayName: "José" },
	remark: null,
	undoable: true,
	onPublishedRoster: false,
	cells: rosterChangePreviewFixture().cells,
	assignments: [],
	...overrides,
});
