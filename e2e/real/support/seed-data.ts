import { appendFileSync, readFileSync } from "node:fs";

import { CREATED_IDENTITIES_FILE, type Role, SEED_FILE } from "./environment";

/** The weeks every flow works on (Mondays). The runs were on 2026-11-08 and 2026-11-09; all of them lie ahead. */
export const WEEKS = {
	published: "2026-11-16",
	draft: "2026-11-23",
	generateFlow: "2026-11-30",
	approvals: "2026-12-07",
	approvalsReject: "2026-12-14",
	coverOffers: "2026-12-21",
	coverOffersUi: "2026-12-28",
	// Round 2 (2026-11-09): clear of round 1's fixed weeks (2027-01-04, 2027-01-18, 2027-02-01) and before the random
	// leave days of 60-leave (from 2027-05-03).
	approvalsUi: "2027-02-08",
	approvalsUiReject: "2027-02-15",
	approvalsWithdraw: "2027-02-22",
	approvalsCancelled: "2027-03-01",
	approvalsCarry: "2027-03-08",
	approvalsDistinct: "2027-03-15",
	leaveIgnored: "2027-03-22",
	withdrawPublication: "2027-03-29",
	leaveFlow: "2027-04-05",
} as const;

export type SeedMember = {
	key: string;
	name: string;
	email: string;
	membershipId: string;
	department: "operations" | "support";
	jobTitle: string;
	role?: Role;
};

/** What the seed created, written to `run/seed.json` and read by every spec. */
export type Seed = {
	runTag: string;
	companyId: string;
	branchId: string;
	departments: Record<"operations" | "support", string>;
	jobTitles: Record<"officer" | "supervisor" | "agent", string>;
	shifts: Record<"morning" | "evening" | "night" | "day", string>;
	constraints: Record<"morning" | "evening" | "night" | "day", string>;
	policyConstraintId: string;
	accessRoles: Record<RoleWithGrant, string>;
	members: SeedMember[];
	membershipIds: Record<Exclude<Role, "ownerB">, string>;
	schedules: Record<"published" | "draft", string>;
	termsIds: { standard: string; partTime: string };
	/** The second company, for data isolation: same shapes, owned by ownerB. */
	companyB: {
		companyId: string;
		branchId: string;
		departmentId: string;
		jobTitleId: string;
		shiftId: string;
		ownerMembershipId: string;
		memberMembershipId: string;
		leaveRequestId: string;
	};
};

export type RoleWithGrant = "manager" | "manager2" | "editor" | "hr" | "approver";

export function readSeed(): Seed {
	return JSON.parse(readFileSync(SEED_FILE, "utf8")) as Seed;
}

/** Every identity the run creates in the shared dev pool, so the cleanup can delete exactly those. */
export function recordCreatedIdentity(email: string): void {
	appendFileSync(CREATED_IDENTITIES_FILE, `${email}\n`);
}

/** Seven ISO days, Monday first; a tuple so `week[0]` is a string, not `string | undefined`. */
export type Week = [string, string, string, string, string, string, string];

/** The roster week's seven days, Monday first. */
export function weekDays(monday: string): Week {
	const start = new Date(`${monday}T00:00:00Z`);
	const days = Array.from({ length: 7 }, (_, index) => {
		const day = new Date(start);
		day.setUTCDate(start.getUTCDate() + index);
		return day.toISOString().slice(0, 10);
	});
	return days as Week;
}

/** A random weekday (Monday–Wednesday, so a three-day span stays on weekdays) in 2027–2028: re-runs never overlap. */
export function freshWeekday(): string {
	const date = new Date(Date.UTC(2027, 4, 3) + Math.floor(Math.random() * 80) * 7 * 86_400_000);
	date.setUTCDate(date.getUTCDate() + Math.floor(Math.random() * 3));
	return date.toISOString().slice(0, 10);
}

export function addDays(day: string, count: number): string {
	const date = new Date(`${day}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + count);
	return date.toISOString().slice(0, 10);
}
