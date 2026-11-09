import { describe, expect, it } from "vitest";
import contract from "../../../contracts/permission-catalog.json";
import {
	PERMISSION_CONTRACT_SHA256,
	PERMISSION_DEFINITIONS,
} from "@/features/workspace/permissionContract.generated";
import {
	companyOnlyKeys,
	incompatibleKeys,
	isAboveDepartments,
	isCompanyOnly,
	isPermissionKey,
	moduleOf,
	PERMISSION_KEYS,
	PERMISSION_MODULES,
	unknownKeys,
} from "@/features/workspace/permissionKeys";

describe("the permission catalogue generated from the API's contract", () => {
	it("holds exactly the contract's keys, in the contract's order", () => {
		expect(contract.schemaVersion).toBe(1);
		expect(PERMISSION_KEYS).toEqual(contract.permissions.map(({ key }) => key));
		expect(PERMISSION_DEFINITIONS.map(({ key }) => key)).toEqual(
			PERMISSION_KEYS
		);
	});

	it("carries the contract's scopes and prerequisites unchanged", () => {
		expect(
			PERMISSION_DEFINITIONS.map(
				({ key, assignableScopes, prerequisites }) => ({
					key,
					assignableScopes,
					prerequisites,
				})
			)
		).toEqual(
			contract.permissions.map(({ key, assignableScopes, prerequisites }) => ({
				key,
				assignableScopes,
				prerequisites,
			}))
		);
		expect(PERMISSION_CONTRACT_SHA256).toMatch(/^[\da-f]{64}$/);
	});

	it("carries the contract's modules, in its order, with each key's module", () => {
		expect(PERMISSION_MODULES).toEqual(contract.modules);
		expect(PERMISSION_KEYS.map(moduleOf)).toEqual(
			contract.permissions.map(({ module }) => module)
		);
		expect(moduleOf("schedule:publish")).toBe("scheduling");
		expect(moduleOf("approval_flow:manage")).toBe("approvals");
		expect(moduleOf("audit_event:read")).toBe("access_and_activity");
	});

	it("tells known keys from keys newer than the app", () => {
		expect(isPermissionKey("branch:read")).toBe(true);
		expect(isPermissionKey("leave:approve")).toBe(false);
		expect(unknownKeys(["branch:read", "leave:approve"])).toEqual([
			"leave:approve",
		]);
	});

	it("names the keys a role can't carry at a level, leaving unknown keys to the API", () => {
		const role = [
			"audit_event:read",
			"branch:read",
			"department:read",
			"leave:approve",
		];
		expect(incompatibleKeys(role, "COMPANY")).toEqual([]);
		expect(incompatibleKeys(role, "BRANCH")).toEqual(["audit_event:read"]);
		expect(incompatibleKeys(role, "DEPARTMENT")).toEqual([
			"branch:read",
			"audit_event:read",
		]);
		expect(isCompanyOnly("branch:create")).toBe(true);
		expect(isCompanyOnly("branch:update")).toBe(false);
	});

	it("names the keys only a company role may hold: those the contract allows at the company alone", () => {
		expect(
			companyOnlyKeys([
				"leave:approve",
				"branch:read",
				"audit_event:read",
				"branch:create",
			])
		).toEqual(["branch:create", "audit_event:read"]);
		expect(companyOnlyKeys(PERMISSION_KEYS)).toEqual(
			contract.permissions
				.filter(
					({ assignableScopes }) =>
						assignableScopes.length === 1 && assignableScopes[0] === "COMPANY"
				)
				.map(({ key }) => key)
		);
	});

	it("tells keys that stop above departments from the rest", () => {
		expect(isAboveDepartments("branch:read")).toBe(true);
		expect(isAboveDepartments("department:create")).toBe(true);
		expect(isAboveDepartments("department:read")).toBe(false);
		// Company-only keys stop higher still.
		expect(isAboveDepartments("branch:create")).toBe(false);
	});
});
