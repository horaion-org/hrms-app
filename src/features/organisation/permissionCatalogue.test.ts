import { describe, expect, it } from "vitest";
import {
	inCatalogueOrder,
	PERMISSION_ACTIONS,
	PERMISSION_CATALOGUE,
	PERMISSION_KEYS,
} from "@/features/organisation/permissionCatalogue";

describe("permission catalogue copy", () => {
	it("pins the API catalogue's keys in its order", () => {
		expect(PERMISSION_KEYS).toEqual([
			"company:read",
			"company:update",
			"company_member:read",
			"branch:read",
			"branch:create",
			"branch:update",
			"branch_member:read",
			"branch_member:create",
			"branch_member:update",
			"branch_member:deactivate",
			"department:read",
			"department:create",
			"department:update",
			"department_member:read",
			"department_member:create",
			"department_member:update",
			"department_member:deactivate",
			"job_title:read",
			"job_title:create",
			"job_title:update",
			"access_role:read",
			"access_role:create",
			"access_role:update",
			"access_role:delete",
			"access_role:assign",
			"audit_event:read",
		]);
	});
	it("lists every resource's actions among the grid's columns", () => {
		for (const { actions } of PERMISSION_CATALOGUE)
			for (const action of actions)
				expect(PERMISSION_ACTIONS).toContain(action);
	});
	it("orders chosen keys by the catalogue and drops unknown ones", () => {
		expect(
			inCatalogueOrder(["audit_event:read", "leave:approve", "branch:read"])
		).toEqual(["branch:read", "audit_event:read"]);
	});
});
