import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { test as setup } from "@playwright/test";

import { ApiClient, expectStatus, rowsOf } from "./support/api";
import { execute, literal } from "./support/database";
import { APP_URL, readAccounts, type Role, SEED_FILE } from "./support/environment";
import { recordCreatedIdentity, type RoleWithGrant, type Seed, type SeedMember, WEEKS } from "./support/seed-data";
import { findMember, importCsv, runImport } from "./support/people";
import { ROLE_KEYS, ROLE_NAMES } from "./support/roles";
import { createSchedule, departmentPath, generateAndWait, schedulePath } from "./support/schedules";

/**
 * Seeds the empty `horaion_e2e` database through the API, as real companies would be set up: company A with seven
 * user types, and company B for data isolation.
 *
 * One step cannot go through the API: the role accounts already exist in Cognito and the API never attaches an
 * existing identity. So each founder is onboarded under a throwaway e2e+ email and each role holder is imported under
 * one, and the `users` row is then pointed at the real account (cognito_sub + email), followed by a facts bump so OPA
 * picks the change up.
 */

const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

setup.setTimeout(900_000);

setup("seed the e2e companies", async () => {
	const accounts = readAccounts();
	const runTag = new Date().toISOString().replace(/\D/g, "").slice(2, 14);
	const email = (local: string) => `e2e+${local}-${runTag}@horaion.com`;
	const signedIn = {} as Record<Role, ApiClient>;
	for (const role of Object.keys(accounts.emails) as Role[]) {
		signedIn[role] = await ApiClient.signIn(accounts.emails[role], accounts.password);
	}

	// 1. Company A's founder becomes the admin account.
	const companyId = await onboard(email("owner"), accounts.password, "E2E Security Co", `e2e-${runTag}`, "Ada Admin");
	pointUserAt(email("owner"), accounts.emails.admin, signedIn.admin.subject());
	const admin = signedIn.admin.withCompany(companyId);
	await waitForAccess(admin);
	const adminMembershipId = (await findMember(admin, accounts.emails.admin)).membershipId;

	// 2. Organisation: one branch, two departments, job titles.
	const branch = expectStatus(
		await admin.post("~/branches", { name: "Central", code: "CEN", city: "Singapore", country: "SG", timeZone: "Asia/Singapore", initialHeadCompanyMembershipIds: [adminMembershipId] }),
		201,
		"create branch"
	);
	const base = { branchId: branch.branchId as string };
	const departments = {
		operations: await createDepartment(admin, base.branchId, "Operations", adminMembershipId),
		support: await createDepartment(admin, base.branchId, "Support", adminMembershipId),
	};
	const jobTitles: Seed["jobTitles"] = {
		officer: await createJobTitle(admin, base, departments.operations, "Security Officer"),
		supervisor: await createJobTitle(admin, base, departments.operations, "Supervisor"),
		agent: await createJobTitle(admin, base, departments.support, "Support Agent"),
	};

	// 3. Shifts: Night crosses midnight; Morning has an unpaid break; Evening carries built-in overtime.
	const operationsRoles = [jobTitles.officer, jobTitles.supervisor];
	const shifts = {
		morning: await createShift(admin, base, departments.operations, { name: "Morning", startTime: "07:00", endTime: "15:00", jobTitleIds: operationsRoles, unpaidBreakMinutes: 60, carriesOvertime: false, colour: "#2563EB" }),
		evening: await createShift(admin, base, departments.operations, { name: "Evening", startTime: "15:00", endTime: "23:00", jobTitleIds: operationsRoles, unpaidBreakMinutes: 0, carriesOvertime: true, colour: "#D97706" }),
		night: await createShift(admin, base, departments.operations, { name: "Night", startTime: "23:00", endTime: "07:00", jobTitleIds: operationsRoles, unpaidBreakMinutes: 0, carriesOvertime: false, colour: "#7C3AED" }),
		day: await createShift(admin, base, departments.support, { name: "Day", startTime: "09:00", endTime: "17:00", jobTitleIds: [jobTitles.agent], unpaidBreakMinutes: 30, carriesOvertime: false, colour: "#059669" }),
	};

	// 4. Staffing per shift (the engine needs demand) and one locked company policy rule.
	const constraints: Seed["constraints"] = {
		morning: await createStaffing(admin, base, departments.operations, "morning officer", jobTitles.officer, shifts.morning),
		evening: await createStaffing(admin, base, departments.operations, "evening officer", jobTitles.officer, shifts.evening),
		night: await createStaffing(admin, base, departments.operations, "night officer", jobTitles.officer, shifts.night),
		day: await createStaffing(admin, base, departments.support, "day agent", jobTitles.agent, shifts.day),
	};
	const policy = expectStatus(
		await admin.post("~/scheduling-policy/constraints", { name: "Rest between shifts", type: "REST_BETWEEN_SHIFTS", status: "ACTIVE", lock: "LOCKED", values: [{ field: "REST_HOURS", value: "11" }] }),
		201,
		"policy constraint"
	);
	expectStatus(await admin.post("~/leave-types", { name: "Study leave", grantKind: "ALLOWANCE", paid: true, requiresReason: false }), 201, "leave type");

	// 5. People: one import (no invitations); the role holders' rows then point at their accounts.
	const people: Omit<SeedMember, "membershipId">[] = [
		{ key: "manager", name: "Mia Manager", email: email("p1"), department: "operations", jobTitle: "Supervisor", role: "manager" },
		{ key: "editor", name: "Eli Editor", email: email("p2"), department: "operations", jobTitle: "Security Officer", role: "editor" },
		{ key: "worker", name: "Wan Worker", email: email("p3"), department: "operations", jobTitle: "Security Officer", role: "worker" },
		{ key: "approver", name: "Ari Approver", email: email("p4"), department: "operations", jobTitle: "Supervisor", role: "approver" },
		{ key: "p5", name: "Omar Officer", email: email("p5"), department: "operations", jobTitle: "Security Officer" },
		{ key: "p6", name: "Lina Officer", email: email("p6"), department: "operations", jobTitle: "Security Officer" },
		{ key: "p7", name: "Priya Officer", email: email("p7"), department: "operations", jobTitle: "Security Officer" },
		{ key: "manager2", name: "Max Manager", email: email("p8"), department: "support", jobTitle: "Support Agent", role: "manager2" },
		{ key: "hr", name: "Hana HR", email: email("p9"), department: "support", jobTitle: "Support Agent", role: "hr" },
		{ key: "p10", name: "Sam Agent", email: email("p10"), department: "support", jobTitle: "Support Agent" },
		{ key: "p11", name: "Tess Agent", email: email("p11"), department: "support", jobTitle: "Support Agent" },
	];
	await runImport(admin, importCsv(people.map((person) => ({ ...person, branch: "CEN", departmentName: person.department === "operations" ? "Operations" : "Support" }))));
	people.forEach((person) => recordCreatedIdentity(person.email));
	const members: SeedMember[] = [];
	for (const person of people) {
		members.push({ ...person, membershipId: (await findMember(admin, person.email)).membershipId });
	}
	for (const member of members.filter((candidate) => candidate.role)) {
		const role = member.role!;
		pointUserAt(member.email, accounts.emails[role], signedIn[role].subject());
		member.email = accounts.emails[role];
	}
	const memberOf = (role: Role) => members.find((member) => member.role === role)!;

	// 6. Roles: department managers and editor at their department, approver at Operations, HR company-wide.
	const accessRoles = {} as Record<RoleWithGrant, string>;
	for (const role of Object.keys(ROLE_KEYS) as RoleWithGrant[]) {
		accessRoles[role] = expectStatus(await admin.post("~/access-roles", { name: ROLE_NAMES[role], permissions: ROLE_KEYS[role] }), 201, `${role} role`).accessRoleId;
		const scopePath = role === "hr" ? "~" : departmentPath(base, role === "manager2" ? departments.support : departments.operations);
		expectStatus(
			await admin.post(`${scopePath}/access-role-assignments`, { companyMembershipId: memberOf(role).membershipId, accessRoleId: accessRoles[role] }),
			201,
			`assign ${role}`
		);
	}

	// 7. Employment terms: the seeded Default plus a dated part-time entry for one person.
	// The terms list answers `{ terms: [...] }`, not a page.
	const termsAnswer = expectStatus(await admin.get("~/employment-terms"), 200, "terms");
	const termsList = termsAnswer?.terms ?? rowsOf(termsAnswer);
	const standard = termsList.find((terms: any) => terms.isDefault ?? terms.default) ?? termsList[0];
	const partTime = expectStatus(
		await admin.post("~/employment-terms", { name: "Part-time 3 days", description: null, daysPerWeek: 3, weekMinutes: 1440, dayMinutes: 480, restDay: "SUN", dailyOvertime: true, shiftWork: false, hoursLimitsApply: true }),
		201,
		"part-time terms"
	);
	const partTimeId = partTime.employmentTermsId ?? partTime.id;
	expectStatus(
		await admin.post(`~/member-profiles/${members.find((member) => member.key === "p7")!.membershipId}/employment-terms`, { employmentTermsId: partTimeId, effectiveFrom: "2026-11-02", contractedWeekMinutes: null, contractedDayMinutes: null }),
		201,
		"dated terms entry"
	);

	// 8. Schedules: Operations' first week generated and published, the second generated and left as a draft.
	const operationsShifts = [shifts.morning, shifts.evening, shifts.night];
	const operationsConstraints = [constraints.morning, constraints.evening, constraints.night];
	const published = await createSchedule(admin, base, departments.operations, { name: "Ops week 47", periodStart: WEEKS.published, shiftIds: operationsShifts, constraintIds: operationsConstraints });
	const publishedResult = await generateAndWait(admin, base, departments.operations, published.scheduleId);
	if (publishedResult.status !== "GENERATED") throw new Error(`published week generation ended ${publishedResult.status}: ${JSON.stringify(publishedResult.generation)}`);
	expectStatus(await admin.post(`${schedulePath(base, departments.operations, published.scheduleId)}/approval`), 200, "publish");
	const draft = await createSchedule(admin, base, departments.operations, { name: "Ops week 48", periodStart: WEEKS.draft, shiftIds: operationsShifts, constraintIds: operationsConstraints });
	const draftResult = await generateAndWait(admin, base, departments.operations, draft.scheduleId);
	if (draftResult.status !== "GENERATED") throw new Error(`draft week generation ended ${draftResult.status}`);

	// 9. Company B: founder becomes ownerB; a branch, department, job title, shift, one member and a leave request.
	const companyBId = await onboard(email("ownerb"), accounts.password, "E2E Other Co", `e2e-b-${runTag}`, "Bea Owner");
	pointUserAt(email("ownerb"), accounts.emails.ownerB, signedIn.ownerB.subject());
	const ownerB = signedIn.ownerB.withCompany(companyBId);
	await waitForAccess(ownerB);
	const ownerBMembershipId = (await findMember(ownerB, accounts.emails.ownerB)).membershipId;
	const branchB = expectStatus(await ownerB.post("~/branches", { name: "Harbour", code: "HBR", city: "Singapore", country: "SG", timeZone: "Asia/Singapore", initialHeadCompanyMembershipIds: [ownerBMembershipId] }), 201, "branch B");
	const baseB = { branchId: branchB.branchId as string };
	const departmentB = await createDepartment(ownerB, baseB.branchId, "Patrol", ownerBMembershipId);
	const jobTitleB = await createJobTitle(ownerB, baseB, departmentB, "Patroller");
	const shiftB = await createShift(ownerB, baseB, departmentB, { name: "Patrol day", startTime: "08:00", endTime: "16:00", jobTitleIds: [jobTitleB], unpaidBreakMinutes: 0, carriesOvertime: false, colour: "#DC2626" });
	const memberBEmail = email("b1");
	await runImport(ownerB, importCsv([{ name: "Bo Patroller", email: memberBEmail, branch: "HBR", departmentName: "Patrol", jobTitle: "Patroller" }]));
	recordCreatedIdentity(memberBEmail);
	const memberBMembershipId = (await findMember(ownerB, memberBEmail)).membershipId;
	const leaveB = expectStatus(
		await ownerB.post(`~/member-profiles/${memberBMembershipId}/leave-requests`, { leaveType: "ANNUAL", startDate: "2026-12-01", endDate: "2026-12-02", notes: "Company B leave" }),
		201,
		"company B leave"
	);

	const seed: Seed = {
		runTag,
		companyId,
		branchId: base.branchId,
		departments,
		jobTitles,
		shifts,
		constraints,
		policyConstraintId: policy.constraintId,
		accessRoles,
		members,
		membershipIds: {
			admin: adminMembershipId,
			manager: memberOf("manager").membershipId,
			manager2: memberOf("manager2").membershipId,
			editor: memberOf("editor").membershipId,
			hr: memberOf("hr").membershipId,
			approver: memberOf("approver").membershipId,
			worker: memberOf("worker").membershipId,
		},
		schedules: { published: published.scheduleId, draft: draft.scheduleId },
		termsIds: { standard: standard?.employmentTermsId ?? standard?.id, partTime: partTimeId },
		companyB: {
			companyId: companyBId,
			branchId: baseB.branchId,
			departmentId: departmentB,
			jobTitleId: jobTitleB,
			shiftId: shiftB,
			ownerMembershipId: ownerBMembershipId,
			memberMembershipId: memberBMembershipId,
			leaveRequestId: leaveB.leaveRequestId,
		},
	};
	mkdirSync(dirname(SEED_FILE), { recursive: true });
	writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2));
});

async function onboard(founderEmail: string, password: string, companyName: string, subdomain: string, displayName: string): Promise<string> {
	const response = await fetch(`${APP_URL}/api/v1/public/onboardings`, {
		method: "POST",
		headers: { "Content-Type": "application/json", Origin: APP_URL },
		body: JSON.stringify({ email: founderEmail, password, companyName, subdomain, displayName }),
	});
	const body = (await response.json()) as { data: { companyId: string } };
	if (response.status !== 201) throw new Error(`onboarding ${companyName}: ${response.status} ${JSON.stringify(body)}`);
	recordCreatedIdentity(founderEmail);
	// What confirming the sign-up email would do (SignUpConfirmationService): the company becomes ACTIVE.
	execute(`UPDATE companies SET status = 'ACTIVE' WHERE uuid = ${literal(body.data.companyId)}`);
	return body.data.companyId;
}

/** Points the user row carrying `fromEmail` at an existing account, then bumps the facts so OPA reloads. */
function pointUserAt(fromEmail: string, toEmail: string, subject: string): void {
	execute(`UPDATE users SET cognito_sub = ${literal(subject)}, email = ${literal(toEmail)} WHERE email = ${literal(fromEmail)}`);
	execute("UPDATE facts_version SET version = version + 1");
}

/** OPA polls the bundle every 2–5 s; company routes refuse until the new facts land. */
async function waitForAccess(api: ApiClient): Promise<void> {
	for (let attempt = 0; attempt < 30; attempt++) {
		if ((await api.get("~/branches")).status === 200) return;
		await new Promise((resolve) => setTimeout(resolve, 1_000));
	}
	throw new Error("the founder never gained access to the company");
}

async function createDepartment(api: ApiClient, branchId: string, name: string, headId: string): Promise<string> {
	return expectStatus(await api.post(`~/branches/${branchId}/departments`, { name, initialHeadCompanyMembershipIds: [headId] }), 201, `department ${name}`).departmentId;
}

async function createJobTitle(api: ApiClient, seed: { branchId: string }, departmentId: string, name: string): Promise<string> {
	return expectStatus(await api.post(`${departmentPath(seed, departmentId)}/job-titles`, { name, description: null }), 201, `job title ${name}`).jobTitleId;
}

async function createShift(
	api: ApiClient,
	seed: { branchId: string },
	departmentId: string,
	input: { name: string; startTime: string; endTime: string; jobTitleIds: string[]; unpaidBreakMinutes: number; carriesOvertime: boolean; colour: string }
): Promise<string> {
	return expectStatus(await api.post(`${departmentPath(seed, departmentId)}/shifts`, { ...input, group: "Core", days: ALL_DAYS }), 201, `shift ${input.name}`).shiftId;
}

async function createStaffing(api: ApiClient, seed: { branchId: string }, departmentId: string, name: string, jobTitleId: string, shiftId: string): Promise<string> {
	return expectStatus(
		await api.post(`${departmentPath(seed, departmentId)}/constraints`, {
			name,
			type: "SHIFT_STAFFING",
			requirement: "MUST",
			status: "ACTIVE",
			values: [
				{ field: "COMPARISON", value: "AT_LEAST" },
				{ field: "HEADCOUNT", value: "1" },
				{ field: "JOB_TITLE", value: jobTitleId },
				{ field: "SHIFT", value: shiftId },
			],
		}),
		201,
		`constraint ${name}`
	).constraintId;
}
