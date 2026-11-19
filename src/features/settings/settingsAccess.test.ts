import { describe, expect, it } from "vitest";
import {
	offeredSections,
	sectionForAccess,
} from "@/features/settings/settingsAccess";
import type {
	OptionalSections,
	SettingsSection,
} from "@/features/settings/sections";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import type { ScopeRef } from "@/features/workspace/scopes";

/** Access holding `companyKeys` company-wide and `unitKeys` only in some unit. */
const accessWith = (
	companyKeys: Array<PermissionKey>,
	unitKeys: Array<PermissionKey> = []
): Parameters<typeof offeredSections>[0] => ({
	can: (permission: PermissionKey, target: ScopeRef) =>
		target.kind === "company" && companyKeys.includes(permission),
	canAnywhere: (permission: PermissionKey) =>
		companyKeys.includes(permission) || unitKeys.includes(permission),
});

const NOTHING: OptionalSections = {
	employment: false,
	scheduling: false,
	"roster-approvals": false,
	"leave-types": false,
	"leave-durations": false,
	"leave-approvals": false,
	access: false,
	data: false,
};

describe("offeredSections", () => {
	it.each([
		["employment", "employment_terms:read"],
		["scheduling", "scheduling_policy:read"],
		["leave-types", "leave_type:read"],
	] as const)(
		"offers %s with %s company-wide, not when held only in a unit",
		(section, key) => {
			expect(offeredSections(accessWith([key]), {})).toEqual({
				...NOTHING,
				[section]: true,
			});
			expect(offeredSections(accessWith([], [key]), {})).toEqual(NOTHING);
		}
	);

	it("offers both approvals with the approval flow read key company-wide", () => {
		expect(
			offeredSections(accessWith(["approval_flow:read"]), {})
		).toEqual({
			...NOTHING,
			"roster-approvals": true,
			"leave-approvals": true,
		});
		expect(
			offeredSections(accessWith([], ["approval_flow:read"]), {})
		).toEqual(NOTHING);
	});

	it.each([
		"employment",
		"scheduling",
		"roster-approvals",
		"leave-types",
		"leave-durations",
		"leave-approvals",
	] as const)(
		"opens %s from a link without its key, to say it is not theirs to see",
		(section: SettingsSection) => {
			expect(offeredSections(accessWith([]), { section })).toEqual({
				...NOTHING,
				[section]: true,
			});
		}
	);

	it("offers only Leave durations to a department admin with the durations read key", () => {
		expect(
			offeredSections(accessWith([], ["leave_duration:read"]), {})
		).toEqual({ ...NOTHING, "leave-durations": true });
	});

	it("offers Access roles with the read key anywhere, and not from a link alone", () => {
		expect(offeredSections(accessWith([], ["access_role:read"]), {})).toEqual({
			...NOTHING,
			access: true,
		});
		expect(offeredSections(accessWith([]), { section: "access" })).toEqual(
			NOTHING
		);
	});

	it("offers Import and export when one of its items is offered, and not from a link alone", () => {
		expect(
			offeredSections(accessWith([], ["member_profile:read"]), {})
		).toEqual({ ...NOTHING, data: true });
		expect(offeredSections(accessWith([]), { section: "data" })).toEqual(
			NOTHING
		);
	});
});

describe("sectionForAccess", () => {
	it("sends a durations-only department admin from Leave types to Leave durations", () => {
		expect(
			sectionForAccess(accessWith([], ["leave_duration:read"]), "leave-types")
		).toBe("leave-durations");
	});

	it("keeps Leave types for anyone else, and every other section as asked", () => {
		expect(
			sectionForAccess(
				accessWith(["leave_type:read", "leave_duration:read"]),
				"leave-types"
			)
		).toBe("leave-types");
		expect(sectionForAccess(accessWith([]), "leave-types")).toBe(
			"leave-types"
		);
		expect(
			sectionForAccess(accessWith([], ["leave_duration:read"]), "data")
		).toBe("data");
		expect(sectionForAccess(accessWith([]), undefined)).toBeUndefined();
	});
});
