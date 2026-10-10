import { describe, expect, it } from "vitest";
import {
	impliedBy,
	LEAVE_READ_KEYS,
	moduleReadKeys,
	ORGANISATION_READ_KEYS,
	PEOPLE_READ_KEYS,
	PERMISSION_IMPLICATIONS,
	PERMISSION_KEYS,
	PERMISSION_MODULES,
	type PermissionKey,
	resourceOf,
	withImplied,
} from "@/features/workspace/permissionKeys";

describe("PERMISSION_MODULES", () => {
	it("places every resource of the catalog in exactly one Module", () => {
		const placed = PERMISSION_MODULES.flatMap(({ resources }) => resources);

		expect([...placed].sort()).toEqual(
			[...new Set(PERMISSION_KEYS.map(resourceOf))].sort()
		);
	});

	it("leaves the keys that offer each Module as they were", () => {
		expect(PEOPLE_READ_KEYS).toEqual(["member_profile:read"]);
		expect(LEAVE_READ_KEYS).toEqual(["leave_request:read"]);
		expect(ORGANISATION_READ_KEYS).toEqual([
			"branch:read",
			"department:read",
			"job_title:read",
			"access_role:read",
			"audit_event:read",
		]);
	});

	it("offers each Module only for the view keys of its own resources", () => {
		for (const [module, keys] of [
			["people", PEOPLE_READ_KEYS],
			["leave", LEAVE_READ_KEYS],
			["organisation", ORGANISATION_READ_KEYS],
		] as const)
			expect(moduleReadKeys(module)).toEqual(expect.arrayContaining([...keys]));
	});
});

describe("PERMISSION_IMPLICATIONS", () => {
	it("implies only view keys of the catalog", () => {
		for (const [key, implied] of Object.entries(PERMISSION_IMPLICATIONS)) {
			expect(PERMISSION_KEYS).toContain(key);
			for (const target of implied) {
				expect(PERMISSION_KEYS).toContain(target);
				expect(target).toMatch(/:read$/);
			}
		}
	});
});

describe("withImplied", () => {
	it("adds what the keys imply, once, in the catalog's order", () => {
		expect(
			withImplied([
				"member_profile:update",
				"member_profile:create",
				"branch:read",
			])
		).toEqual([
			"branch:read",
			"job_title:read",
			"member_profile:create",
			"member_profile:update",
		]);
	});

	it("leaves keys that imply nothing as they are", () => {
		expect(withImplied([])).toEqual([]);
		expect(withImplied(["job_title:read", "company:read"])).toEqual([
			"company:read",
			"job_title:read",
		]);
	});

	it("follows implications through implied keys", () => {
		const implications = PERMISSION_IMPLICATIONS as Record<
			string,
			Array<PermissionKey>
		>;
		implications["job_title:read"] = ["branch:read"];
		try {
			expect(withImplied(["member_profile:create"])).toEqual([
				"branch:read",
				"job_title:read",
				"member_profile:create",
			]);
			expect(impliedBy("branch:read", ["member_profile:create"])).toEqual([
				"member_profile:create",
			]);
		} finally {
			delete implications["job_title:read"];
		}
	});
});

describe("impliedBy", () => {
	it("names the held keys that imply a key, in the catalog's order", () => {
		expect(
			impliedBy("job_title:read", [
				"member_profile:update",
				"job_title:read",
				"member_profile:create",
			])
		).toEqual(["member_profile:create", "member_profile:update"]);
	});

	it("names nothing when no held key implies it", () => {
		expect(impliedBy("job_title:read", ["member_profile:read"])).toEqual([]);
		expect(impliedBy("member_profile:create", ["job_title:read"])).toEqual([]);
	});
});
