import { describe, expect, it } from "vitest";
import contract from "../../../contracts/permission-catalog.json";
import {
	PERMISSION_CONTRACT_SHA256,
	PERMISSION_DEFINITIONS,
} from "@/features/workspace/permissionContract.generated";
import {
	incompatibleKeys,
	isCompanyOnly,
	isPermissionKey,
	PERMISSION_KEYS,
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
});
