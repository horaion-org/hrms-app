import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { ApiClient, expectStatus, rowsOf } from "./support/api";
import { queryRows } from "./support/database";
import { COMPANY_A_ROLES, readAccounts, type Role, RUN_DIRECTORY } from "./support/environment";
import {
	bindPath,
	type CallTarget,
	type Expectation,
	expectedOutcome,
	type Grants,
	grantsFor,
	judge,
	type RouteDefinition,
	type Verdict,
} from "./support/permission-matrix";
import { readSeed, type Seed, WEEKS } from "./support/seed-data";
import { ROLE_KEYS } from "./support/roles";
import { actual } from "./support/ui";

/**
 * E2E-PM: the permission matrix. Every company route in the backend (extracted from the controllers into
 * run/routes.json by tools/extract_routes.py) is called as every user type, per department variant, and judged
 * against the expected answer of its guard. Writes never change data: an admitted write stops at an empty body ({}), an empty upload, or a
 * random id for the record it would act on. Results: run/matrix-results.json and run/matrix.md.
 */

const ROUTES_FILE = process.env["E2E_ROUTES_FILE"] ?? `${RUN_DIRECTORY}/run/routes.json`;
const CATALOG_KEYS: string[] = (
	JSON.parse(
		readFileSync(process.env["E2E_CATALOG_FILE"] ?? `${RUN_DIRECTORY}/run/permission-catalog.json`, "utf8")
	) as { permissions: { key: string }[] }
).permissions.map((entry) => entry.key);

type Variant = "operations" | "support" | "mismatch" | "company-b";
type MatrixRow = {
	route: string;
	method: string;
	key: string;
	mode: string;
	variant: Variant;
	role: Role;
	url: string;
	expected: Expectation;
	status: number;
	verdict: Verdict;
	note?: string;
};

test.describe.configure({ mode: "serial" });
test.setTimeout(1_800_000);

test("E2E-PM-001 every route × every user type answers as its guard says", async () => {
	const seed = readSeed();
	const accounts = readAccounts();
	const routes = JSON.parse(readFileSync(ROUTES_FILE, "utf8")) as RouteDefinition[];
	const clients = {} as Record<Role, ApiClient>;
	for (const role of [...COMPANY_A_ROLES, "ownerB" as Role]) {
		clients[role] = await ApiClient.signIn(accounts.emails[role], accounts.password);
	}
	const subjects = Object.fromEntries(Object.entries(clients).map(([role, client]) => [role, client.subject()]));
	const admin = clients.admin.withCompany(seed.companyId);
	const fixtures = await prepareFixtures(admin, seed);
	const grants = roleGrants(seed);
	const startedAt = new Date().toISOString();

	const rows: MatrixRow[] = [];
	const companyRoutes = routes.filter((route) => route.path.includes("{companyId}"));
	for (const route of companyRoutes) {
		for (const variant of variantsFor(route)) {
			const binding = bindingFor(route, variant, seed, fixtures);
			if (!binding) continue;
			// Company B's owner also calls company A's own routes (every method): a non-member must be refused.
			const callers: Role[] = variant === "company-b" ? ["ownerB", "admin"] : variant === "operations" ? [...COMPANY_A_ROLES, "ownerB"] : COMPANY_A_ROLES;
			for (const role of callers) {
				const isMember = variant === "company-b" ? role === "ownerB" : role !== "ownerB";
				const expected =
					variant === "company-b"
						? role === "ownerB"
							? binding.foreignIds
								? "HIDE"
								: "PASS"
							: "REFUSE"
						: !isMember
							? "REFUSE"
							: variant === "mismatch"
							? mismatchExpectation(route)
							: (meRecordExpectation(route, role, binding.department) ??
								(binding.notFoundAccepted ? "EITHER" : expectedOutcome(route, grants[role], isMember, binding.target)));
				const status = await call(clients[role], route, binding.url);
				const key = typeof route.guard === "object" ? route.guard.key : String(route.guard);
				const heldElsewhere = typeof route.guard === "object" && (grants[role][route.guard.key] ?? []).length > 0;
				rows.push({
					route: route.path.replace("/api/v1/companies/{companyId}", "~"),
					method: route.method,
					key,
					mode: typeof route.guard === "object" ? route.guard.target : String(route.guard),
					variant,
					role,
					url: binding.url,
					expected,
					status: status.status,
					verdict: status.leak ? "LEAK" : judge(expected, status.status, route.method, heldElsewhere),
					note: status.leak ? `body names ${status.leak}` : undefined,
				});
			}
		}
	}

	// Routes outside a company (/api/v1/me...): every signed-in user type is admitted.
	for (const route of routes.filter((candidate) => candidate.path.startsWith("/api/v1/me") && candidate.method === "GET")) {
		for (const role of COMPANY_A_ROLES) {
			const status = await call(clients[role], route, route.path);
			rows.push({ route: route.path, method: route.method, key: String(route.guard), mode: "SIGNED_IN", variant: "operations", role, url: route.path, expected: "PASS", status: status.status, verdict: judge("PASS", status.status, "GET", false) });
		}
	}

	// Every 403 must have left a DENIED audit row naming the caller, the endpoint and the method.
	const denied = queryRows(`SELECT actor_sub, detail FROM audit_events WHERE outcome = 'DENIED' AND occurred_at >= '${startedAt}'`);
	// The audit trail caps each detail value at 255 characters (AuditDetailValues), so long endpoints match by prefix.
	const deniedEntries = denied.map((row) => {
		const detail = JSON.parse(row["detail"] || "{}") as { http_method?: string; endpoint?: string };
		return { actor: row["actor_sub"], method: detail.http_method, endpoint: detail.endpoint ?? "" };
	});
	const unaudited = rows.filter(
		(row) =>
			row.status === 403 &&
			!deniedEntries.some(
				(entry) => entry.actor === subjects[row.role] && entry.method === row.method && (row.url.split("?")[0] ?? "").startsWith(entry.endpoint) && entry.endpoint.length > 0
			)
	);

	writeResults(rows, unaudited, routes);
	await cleanFixtures(admin, fixtures);

	const failures = rows.filter((row) => !["OK", "INCONCLUSIVE"].includes(row.verdict));
	expect.soft(unaudited.map((row) => `${row.role} ${row.method} ${row.url}`), "403s without a DENIED audit row").toEqual([]);
	expect(failures.map((row) => `${row.verdict} ${row.role} ${row.method} ${row.route} [${row.variant}] expected ${row.expected} got ${row.status}`)).toEqual([]);
});

/** The grants each user type holds in company A, mirroring the seed's role assignments. */
function roleGrants(seed: Seed): Record<Role, Grants> {
	const operations = { kind: "department" as const, departmentId: seed.departments.operations };
	const support = { kind: "department" as const, departmentId: seed.departments.support };
	return {
		admin: grantsFor(CATALOG_KEYS, { kind: "company" }),
		manager: grantsFor(ROLE_KEYS.manager, operations),
		manager2: grantsFor(ROLE_KEYS.manager2, support),
		editor: grantsFor(ROLE_KEYS.editor, operations),
		approver: grantsFor(ROLE_KEYS.approver, operations),
		hr: grantsFor(ROLE_KEYS.hr, { kind: "company" }),
		worker: {},
		ownerB: {},
	};
}

/** Department routes run once per department; record routes once per department of the record; plus isolation. */
function variantsFor(route: RouteDefinition): Variant[] {
	const params = route.path.match(/\{(\w+)\}/g) ?? [];
	const variants: Variant[] = ["operations"];
	const departmentBound = params.some((param) => ["{departmentId}", "{membershipId}", "{leaveRequestId}", "{scheduleId}", "{memberId}"].includes(param));
	if (departmentBound) variants.push("support");
	const hasChildOfDepartment = route.path.includes("{departmentId}/") && /\{(scheduleId|shiftId|constraintId|jobTitleId|memberId)\}/.test(route.path);
	if (hasChildOfDepartment) variants.push("mismatch");
	if (route.method === "GET") variants.push("company-b");
	return variants;
}

/**
 * The binding for a mismatched path (Support's department with an Operations child): nobody may read Operations'
 * record through Support's path. Admin and Support's manager get 404; anyone without a Support grant gets 403.
 */
function mismatchExpectation(route: RouteDefinition): Expectation {
	if (typeof route.guard !== "object") return "EITHER";
	return "HIDE";
}

/** Ids a route may name: one per department where the record belongs to a department, otherwise one for both. */
type Fixtures = { perDepartment: Record<string, Record<"operations" | "support", string>>; single: Record<string, string> };

/** Real records per department that the read routes name; created here when the seed does not have them. */
async function prepareFixtures(admin: ApiClient, seed: Seed): Promise<Fixtures> {
	const memberIn = (key: string) => seed.members.find((member) => member.key === key)!.membershipId;
	const operationsMember = memberIn("p5");
	const supportMember = memberIn("p10");
	const supportSchedule = expectStatus(
		await admin.post(`~/branches/${seed.branchId}/departments/${seed.departments.support}/schedules`, {
			name: "Support matrix week",
			periodStart: "2027-01-04",
			includeLeave: true,
			allowOpenShifts: false,
			includedShiftIds: [seed.shifts.day],
			includedConstraintIds: [seed.constraints.day],
		}),
		201,
		"support schedule"
	).scheduleId;
	// A fresh day per run, so re-runs against the same database never overlap an earlier run's request.
	const leaveDate = new Date(Date.UTC(2027, 1, 1) + Math.floor(Math.random() * 600) * 86_400_000);
	while ([0, 6].includes(leaveDate.getUTCDay())) leaveDate.setUTCDate(leaveDate.getUTCDate() + 1);
	const leaveDay = leaveDate.toISOString().slice(0, 10);
	const leave = async (membershipId: string) =>
		expectStatus(
			await admin.post(`~/member-profiles/${membershipId}/leave-requests`, { leaveType: "ANNUAL", startDate: leaveDay, endDate: leaveDay, notes: "matrix" }),
			201,
			"matrix leave"
		).leaveRequestId;
	const note = async (membershipId: string) =>
		expectStatus(await admin.post(`~/member-profiles/${membershipId}/notes`, { body: "matrix note" }), 201, "note").noteId;
	const skill = expectStatus(await admin.post("~/skills", { name: `Matrix skill ${randomUUID().slice(0, 8)}`, category: "General", description: null, proficiencyScale: "NONE", tracksExpiry: false, validityMonths: null }), 201, "skill");
	// A flow left by an earlier, interrupted run is reused; whichever flow the matrix used is deleted at the end, since
	// an active flow on Support would turn every later Support publish into an approval request.
	const existingFlow = rowsOf((await admin.get("~/approval-flows")).data).find((candidate: any) => candidate.departmentId === seed.departments.support && candidate.name === "Matrix flow");
	const flow = existingFlow ?? expectStatus(
		await admin.post("~/approval-flows", {
			subjectType: "SCHEDULE_PUBLICATION",
			departmentId: seed.departments.support,
			name: "Matrix flow",
			steps: [{ label: "Check", rule: "KEY_HOLDERS", quorum: "ANY" }],
		}),
		201,
		"approval flow"
	);
	const assignments = rowsOf((await admin.get(`~/access-role-assignments?companyMembershipId=${seed.membershipIds.manager}`)).data);
	const imports = rowsOf((await admin.get("~/member-imports")).data);
	const notifications = rowsOf((await admin.get("~/me/notifications?page=0&size=5")).data);
	const leaveTypes = rowsOf((await admin.get("~/leave-types")).data);
	const termsEntries = (await admin.get(`~/member-profiles/${memberIn("p7")}/employment-terms`)).data;
	return {
		perDepartment: {
		membershipId: { operations: operationsMember, support: supportMember },
		memberId: { operations: operationsMember, support: supportMember },
		scheduleId: { operations: seed.schedules.published, support: supportSchedule },
		leaveRequestId: { operations: await leave(operationsMember), support: await leave(supportMember) },
		noteId: { operations: await note(operationsMember), support: await note(supportMember) },
		jobTitleId: { operations: seed.jobTitles.officer, support: seed.jobTitles.agent },
		shiftId: { operations: seed.shifts.morning, support: seed.shifts.day },
		constraintId: { operations: seed.constraints.morning, support: seed.constraints.day },
		},
		single: {
			skillId: skill.skillId ?? skill.id,
			flowId: flow.approvalFlowId ?? flow.flowId ?? flow.id,
			createdFlow: existingFlow ? "" : "yes",
			accessRoleId: seed.accessRoles.editor,
			accessRoleAssignmentId: assignments[0]?.accessRoleAssignmentId ?? assignments[0]?.assignmentId ?? randomUUID(),
			importId: imports[0]?.importId ?? randomUUID(),
			notificationId: notifications[0]?.notificationId ?? notifications[0]?.id ?? randomUUID(),
			leaveTypeId: leaveTypes.find((type: any) => type.name === "Study leave")?.leaveTypeId ?? randomUUID(),
			id: seed.termsIds.partTime,
			entryId: firstValue(termsEntries, "entryId") ?? randomUUID(),
			policyConstraintId: seed.policyConstraintId,
			weekStartMonday: WEEKS.published,
			day: leaveDay,
			instanceId: randomUUID(),
			offerId: randomUUID(),
			changeId: randomUUID(),
		},
	};
}

async function cleanFixtures(admin: ApiClient, fixtures: Fixtures): Promise<void> {
	await admin.delete(`~/approval-flows/${fixtures.single["flowId"]}`);
}

function firstValue(value: any, key: string): string | undefined {
	if (!value || typeof value !== "object") return undefined;
	if (typeof value[key] === "string") return value[key];
	for (const child of Object.values(value)) {
		const found = firstValue(child, key);
		if (found) return found;
	}
	return undefined;
}

/** Paths that end in a collection (or its preview / approved-record form): a POST there creates, it acts on no record. */
const COLLECTION_CREATE = /\/(leave-requests(\/approved)?|notes|skills|employment-terms|assignments|members|member-profiles|cover-offers|roster-changes(\/preview)?|access-role-assignments|job-titles|shifts|constraints|departments|schedules|changes|decisions)$/;

const QUERY_DEFAULTS: Record<string, string> = {
	periodStart: WEEKS.published,
	startDate: WEEKS.published,
	endDate: "2026-11-22",
	subjectType: "SCHEDULE_PUBLICATION",
	page: "0",
	size: "5",
	audience: "PERSONAL",
};

/** Ids for one call. Writes act on a random id where they take no body, so nothing changes when admitted. */
type Binding = { url: string; target: CallTarget; foreignIds: boolean; notFoundAccepted: boolean; department: "operations" | "support" };

function bindingFor(route: RouteDefinition, variant: Variant, seed: Seed, fixtures: Fixtures): Binding | null {
	if (route.method === "DELETE" && route.body === "json") return null;
	const department: "operations" | "support" = variant === "support" ? "support" : "operations";
	const values: Record<string, string> = {
		companyId: variant === "company-b" ? seed.companyB.companyId : seed.companyId,
		branchId: seed.branchId,
		departmentId: variant === "mismatch" ? seed.departments.support : seed.departments[department],
		...fixtures.single,
	};
	for (const [name, perDepartment] of Object.entries(fixtures.perDepartment)) values[name] = perDepartment[department];
	if (route.path.includes("scheduling-policy/constraints/{constraintId}")) values["constraintId"] = fixtures.single["policyConstraintId"] ?? "";
	values["subjectId"] = values["scheduleId"] ?? "";

	const params = [...route.path.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? "");
	const leaf = params[params.length - 1] ?? "";
	// A write on a record acts on a random id of that record (admitted → 404, nothing changes); only a create on a
	// collection keeps the real parent ids and sends an empty body, which validation refuses (admitted → 400).
	const isWrite = route.method !== "GET";
	const createsInCollection = isWrite && route.method === "POST" && route.body !== null && COLLECTION_CREATE.test(route.path);
	if (isWrite && !createsInCollection && leaf && !["companyId", "branchId", "departmentId"].includes(leaf)) {
		values[leaf] = randomUUID();
	}
	const query = route.query.filter((parameter) => parameter.required).map((parameter) => parameter.name);
	const queryValues: Record<string, string> = { ...QUERY_DEFAULTS, subjectId: values["scheduleId"] ?? "", companyMembershipId: values["membershipId"] ?? "", weekStartMonday: WEEKS.published };
	const url = bindPath(route.path, values) + (query.length ? `?${query.map((name) => `${name}=${queryValues[name]}`).join("&")}` : "");
	const recordParams = params.filter((param) => !["companyId", "branchId", "departmentId"].includes(param));
	const target: CallTarget = {
		pathDepartmentId: route.path.includes("{departmentId}") ? (values["departmentId"] ?? null) : null,
		pathBranchOnly: route.path.includes("{branchId}") && !route.path.includes("{departmentId}"),
		recordDepartmentId: recordParams.some((param) => ["membershipId", "leaveRequestId", "scheduleId", "memberId", "noteId"].includes(param)) ? seed.departments[department] : null,
		namesRecord: recordParams.length > 0,
	};
	// A GET of a record that cannot exist (a random id, a week with no override) may answer 404 to anyone.
	const notFoundAccepted = route.method === "GET" && ["instanceId", "offerId", "changeId", "weekStartMonday", "importId"].includes(leaf);
	return { url, target, foreignIds: variant === "company-b" && params.length > 1, notFoundAccepted, department };
}

/**
 * /me routes that name a record: only its owner may read it. The leave requests and notes were created for other
 * people, a notification belongs to the admin, and the published roster lists Operations' staff only.
 */
function meRecordExpectation(route: RouteDefinition, role: Role, department: "operations" | "support"): Expectation | null {
	if (!route.path.includes("/me/") || !/\{(leaveRequestId|notificationId|scheduleId|instanceId|offerId)\}/.test(route.path)) return null;
	if (route.path.includes("{notificationId}")) return role === "admin" ? "EITHER" : "HIDE";
	if (route.path.includes("{scheduleId}")) {
		const operationsStaff: Role[] = ["manager", "editor", "approver", "worker"];
		return department === "operations" && operationsStaff.includes(role) ? "PASS" : "HIDE";
	}
	return "HIDE";
}

const COMPANY_B_MARKERS = (seed: Seed) => [seed.companyB.companyId, seed.companyB.branchId, seed.companyB.departmentId, seed.companyB.memberMembershipId, "E2E Other Co", "Bo Patroller", "Harbour"];
const COMPANY_A_MARKERS = (seed: Seed) => [seed.companyId, seed.branchId, seed.departments.operations, seed.departments.support, "E2E Security Co", "Wan Worker", "Operations"];

/** Sends one call and scans a successful body for the other company's identifiers. */
async function call(client: ApiClient, route: RouteDefinition, url: string): Promise<{ status: number; leak?: string }> {
	const seed = readSeed();
	const scoped = new ApiClient((client as any).accessToken, undefined);
	let result;
	if (route.method === "GET") result = await scoped.get(url);
	else if (route.body === "multipart") result = await scoped.upload(url, new FormData());
	else if (route.body === "json") result = await (scoped as any)[route.method.toLowerCase()](url, {});
	else result = await (scoped as any)[route.method.toLowerCase()](url);
	if (result.status >= 200 && result.status < 300) {
		const isCompanyB = url.includes(seed.companyB.companyId);
		const markers = isCompanyB ? COMPANY_A_MARKERS(seed) : COMPANY_B_MARKERS(seed);
		const leak = markers.find((marker) => result.text.includes(marker));
		return { status: result.status, leak };
	}
	return { status: result.status };
}

/** Writes the matrix as JSON and as a route × role markdown table for the report. */
function writeResults(rows: MatrixRow[], unaudited: MatrixRow[], routes: RouteDefinition[]): void {
	writeFileSync(`${RUN_DIRECTORY}/run/matrix-results.json`, JSON.stringify({ rows, unaudited }, null, 1));
	const roles = [...COMPANY_A_ROLES, "ownerB"];
	const cell = (row?: MatrixRow) => (row ? `${short(row.expected)}/${row.status}${row.verdict === "OK" ? "" : row.verdict === "INCONCLUSIVE" ? " ?" : ` **${row.verdict}**`}` : "");
	const groups = new Map<string, MatrixRow[]>();
	for (const row of rows) {
		const id = `${row.method} ${row.route} [${row.variant}]`;
		groups.set(id, [...(groups.get(id) ?? []), row]);
	}
	const lines = [
		`| Route [variant] | Key (mode) | ${roles.join(" | ")} |`,
		`|---|---|${roles.map(() => "---").join("|")}|`,
		...[...groups.entries()].map(([id, group]) => `| ${id} | ${group[0]?.key} (${group[0]?.mode}) | ${roles.map((role) => cell(group.find((row) => row.role === role))).join(" | ")} |`),
	];
	const tested = new Set(rows.map((row) => `${row.method} ${row.route}`));
	const companyRoutes = routes.filter((route) => route.path.includes("{companyId}") || route.path.startsWith("/api/v1/me"));
	const summary = [
		`Routes in the backend: ${routes.length}; company and /me routes: ${companyRoutes.length}; tested: ${tested.size}; calls: ${rows.length}.`,
		`Verdicts: ${JSON.stringify(rows.reduce((counts: Record<string, number>, row) => ({ ...counts, [row.verdict]: (counts[row.verdict] ?? 0) + 1 }), {}))}.`,
		`403s without a DENIED audit row: ${unaudited.length}.`,
		"Cell = expected/actual status. P = pass, R = refuse (403/404), H = hide (404 or 403, no data), E = either. ? = admitted past the guard but stopped by validation before the record-level scope check (inconclusive, not a leak).",
	];
	writeFileSync(`${RUN_DIRECTORY}/run/matrix.md`, [...summary, "", ...lines].join("\n"));
}

function short(expected: Expectation): string {
	return { PASS: "P", REFUSE: "R", HIDE: "H", EITHER: "E" }[expected];
}

/**
 * E2E-PM-002: lists are filtered to the caller's scope. Every company-level list route (no record or unit in the
 * path) is read as each department-scoped user type, and every departmentId anywhere in the answer must be a
 * department where that user holds the route's key.
 */
test("E2E-PM-002 company-level lists only return the caller's departments", async () => {
	const seed = readSeed();
	const accounts = readAccounts();
	const routes = JSON.parse(readFileSync(ROUTES_FILE, "utf8")) as RouteDefinition[];
	const grants = roleGrants(seed);
	const lists = routes.filter(
		(route) =>
			route.method === "GET" &&
			typeof route.guard === "object" &&
			/^\/api\/v1\/companies\/\{companyId\}\/[\w-]+$/.test(route.path) &&
			route.query.every((parameter) => !parameter.required || ["companyMembershipId", "weekStartMonday"].includes(parameter.name))
	);
	const findings: string[] = [];
	const checked: string[] = [];
	for (const role of ["manager", "manager2", "editor", "approver", "hr", "worker"] as Role[]) {
		const client = (await ApiClient.signIn(accounts.emails[role], accounts.password)).withCompany(seed.companyId);
		for (const route of lists) {
			const key = (route.guard as { key: string }).key;
			const scopes = grants[role][key] ?? [];
			if (scopes.some((scope) => scope.kind === "company")) continue;
			const allowed = new Set(scopes.map((scope) => (scope.kind === "department" ? scope.departmentId : "")));
			const query = route.query.filter((parameter) => parameter.required).map((parameter) => `${parameter.name}=${parameter.name === "weekStartMonday" ? WEEKS.published : seed.membershipIds.manager}`);
			const result = await client.get(route.path.replace("/api/v1/companies/{companyId}", "~") + (query.length ? `?${query.join("&")}` : ""));
			if (result.status !== 200) continue;
			checked.push(`${role} ${route.path}`);
			const foreign = [...collectValues(result.body, "departmentId")].filter((id) => [seed.departments.operations, seed.departments.support].includes(id) && !allowed.has(id));
			if (foreign.length) findings.push(`${role} GET ${route.path} returned rows of department(s) ${[...new Set(foreign)].join(", ")}`);
		}
	}
	writeFileSync(`${RUN_DIRECTORY}/run/list-scope.json`, JSON.stringify({ checked, findings }, null, 1));
	expect(findings).toEqual([]);
});

function collectValues(value: any, key: string, found: Set<string> = new Set()): Set<string> {
	if (Array.isArray(value)) value.forEach((item) => collectValues(item, key, found));
	else if (value && typeof value === "object") {
		for (const [name, child] of Object.entries(value)) {
			if (name === key && typeof child === "string") found.add(child);
			else collectValues(child, key, found);
		}
	}
	return found;
}

/** The role API's refusal when a write key comes without its read key. */
const PREREQUISITE_MISSING = "INVALID_ACCESS_ROLE_PERMISSIONS";

/** Write keys whose read key ADR-0048 makes mandatory, each paired with that read key. */
const WRITE_WITHOUT_READ: [write: string, read: string][] = [
	["schedule:update", "schedule:read"],
	["schedule:edit_shift", "schedule:read"],
	["leave_request:review", "leave_request:read"],
	["leave_type:update", "leave_type:read"],
	["approval:decide", "approval:read"],
];

test("E2E-PM-003 a write key cannot be granted without its read key (ADR-0048), on create or on update", async ({}, testInfo) => {
	const seed = readSeed();
	const accounts = readAccounts();
	const admin = (await ApiClient.signIn(accounts.emails.admin, accounts.password)).withCompany(seed.companyId);
	const lines: string[] = [];
	const failures: string[] = [];
	for (const [write, read] of WRITE_WITHOUT_READ) {
		const name = `Prereq ${randomUUID().slice(0, 8)}`;
		const refused = await admin.post("~/access-roles", { name, permissions: [write] });
		lines.push(`${write} alone → ${refused.status} ${refused.errorCode ?? ""}`);
		if (refused.status !== 400 || refused.errorCode !== PREREQUISITE_MISSING) failures.push(`${write} without ${read} → ${refused.status} ${refused.errorCode ?? ""}`);
		if (refused.status === 201) await admin.delete(`~/access-roles/${refused.data?.accessRoleId}`);
	}
	// Control: the same key with its read key is accepted; then an update that drops the read key is refused.
	const control = await admin.post("~/access-roles", { name: `Prereq ${randomUUID().slice(0, 8)}`, permissions: ["schedule:read", "schedule:update"] });
	const roleId = control.data?.accessRoleId;
	const dropped = await admin.put(`~/access-roles/${roleId}`, { name: control.data?.name, permissions: ["schedule:update"], status: "ACTIVE" });
	await admin.delete(`~/access-roles/${roleId}`);
	lines.push(`with read → ${control.status}; update dropping read → ${dropped.status} ${dropped.errorCode ?? ""}`);
	actual(testInfo, lines.join("; "));
	expect(control.status).toBe(201);
	expect(dropped.status).toBe(400);
	expect(dropped.errorCode).toBe(PREREQUISITE_MISSING);
	expect(failures).toEqual([]);
});
