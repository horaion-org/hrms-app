/**
 * The permission matrix's pure part: what each user type should get from each route, and how an actual status is
 * judged against it. No I/O here; the spec binds ids, sends requests and records results.
 *
 * Model (ADR-0047 target modes, as the guard documents them):
 * - COMPANY: only a company-scope grant of the key admits.
 * - PATH: the branch or department named in the path is the target; a grant there or above admits.
 * - SCOPED: a unit named in the path is checked like PATH; otherwise the service filters lists and authorises the
 *   record it loads, so a holder of the key elsewhere sees a filtered list and gets 404 (or 403) for a foreign record.
 * - ANYWHERE: the key held anywhere in the company admits.
 * - MEMBERSHIP_ONLY: every member of the company is admitted.
 */

export type Guard = { key: string; target: "COMPANY" | "PATH" | "SCOPED" | "ANYWHERE" | "DEFAULT" } | "MEMBERSHIP_ONLY" | string;

export type RouteDefinition = {
	controller: string;
	method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	path: string;
	guard: Guard;
	body: "json" | "multipart" | null;
	scopes: boolean;
	query: { name: string; required: boolean }[];
};

/** Where a grant applies: the whole company or one department. */
export type GrantScope = { kind: "company" } | { kind: "department"; departmentId: string };
export type Grants = Record<string, GrantScope[]>;

/** What the binding of one call targets: the department in the path, else the department of the record named. */
export type CallTarget = {
	pathDepartmentId: string | null;
	pathBranchOnly: boolean;
	recordDepartmentId: string | null;
	/** True when the call names a record (a GET of one item, or a write on one). */
	namesRecord: boolean;
};

export type Expectation = "PASS" | "REFUSE" | "HIDE" | "EITHER";

export type Verdict =
	| "OK"
	| "LEAK"
	| "GUARD_ORDER"
	| "UNDER_GRANT"
	| "SERVER_ERROR"
	| "INCONCLUSIVE";

export function grantsFor(keys: string[], scope: GrantScope): Grants {
	return Object.fromEntries(keys.map((key) => [key, [scope]]));
}

function holdsAnywhere(grants: Grants, key: string): boolean {
	return (grants[key] ?? []).length > 0;
}

function holdsAtCompany(grants: Grants, key: string): boolean {
	return (grants[key] ?? []).some((scope) => scope.kind === "company");
}

function holdsAtDepartment(grants: Grants, key: string, departmentId: string): boolean {
	return (grants[key] ?? []).some((scope) => scope.kind === "company" || scope.departmentId === departmentId);
}

/** The expected answer for one call, from the route's guard, the caller's grants and what the call targets. */
export function expectedOutcome(route: RouteDefinition, grants: Grants, isMember: boolean, target: CallTarget): Expectation {
	if (!isMember) return "REFUSE";
	if (route.guard === "MEMBERSHIP_ONLY") return "PASS";
	if (typeof route.guard === "string") return "EITHER";
	const { key, target: mode } = route.guard;
	switch (mode) {
		case "COMPANY":
			return holdsAtCompany(grants, key) ? "PASS" : "REFUSE";
		case "ANYWHERE":
			return holdsAnywhere(grants, key) ? "PASS" : "REFUSE";
		case "PATH":
		case "SCOPED":
		case "DEFAULT": {
			if (target.pathDepartmentId) {
				return holdsAtDepartment(grants, key, target.pathDepartmentId) ? "PASS" : "REFUSE";
			}
			if (target.pathBranchOnly) {
				if (holdsAtCompany(grants, key)) return "PASS";
				// A department grant on a branch-level list: filtered or refused are both defensible.
				return holdsAnywhere(grants, key) && mode === "SCOPED" ? "EITHER" : "REFUSE";
			}
			if (mode === "PATH") return holdsAtCompany(grants, key) ? "PASS" : "REFUSE";
			if (!holdsAnywhere(grants, key)) return "REFUSE";
			if (!target.namesRecord || !target.recordDepartmentId) return holdsAtCompany(grants, key) || !target.namesRecord ? "PASS" : "EITHER";
			return holdsAtDepartment(grants, key, target.recordDepartmentId) ? "PASS" : "HIDE";
		}
		default:
			return "EITHER";
	}
}

/**
 * Judges an actual status. A write that the guard admits stops at body validation or a random record id, so any
 * non-refusal counts as admitted; a read with real ids must answer 200.
 */
export function judge(expected: Expectation, status: number, method: string, keyHeldElsewhere: boolean): Verdict {
	if (status >= 500) return "SERVER_ERROR";
	const refused = status === 403 || status === 404;
	const success = status >= 200 && status < 300;
	switch (expected) {
		case "PASS":
			if (status === 403) return "UNDER_GRANT";
			if (method === "GET" && status === 404) return "UNDER_GRANT";
			return "OK";
		case "REFUSE":
		case "HIDE":
			if (refused) return "OK";
			if (success) return "LEAK";
			// 400/409/422 behind a refusal: the request got past the guard. When the key is held elsewhere and the
			// route authorises the record in the service, validation may legitimately run first.
			return keyHeldElsewhere ? "INCONCLUSIVE" : "GUARD_ORDER";
		case "EITHER":
			return "OK";
	}
}

/** Fills `{name}` placeholders; unknown names are left for the caller to notice. */
export function bindPath(path: string, values: Record<string, string>): string {
	return path.replace(/\{(\w+)\}/g, (whole, name) => values[name] ?? whole);
}
