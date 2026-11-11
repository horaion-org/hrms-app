import { describe, expect, it } from "vitest";
import { offeredSections } from "@/features/settings/settingsAccess";
import type { SettingsSection } from "@/features/settings/sections";
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

const NOTHING = {
	employment: false,
	scheduling: false,
	leave: false,
	approvals: false,
	access: false,
	data: false,
};

describe("offeredSections", () => {
	it.each([
		["employment", "employment_terms:read"],
		["scheduling", "scheduling_policy:read"],
		["leave", "leave_type:read"],
		["approvals", "approval_flow:read"],
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

	it.each(["employment", "scheduling", "leave", "approvals"] as const)(
		"opens %s from a link without its key, to say it is not theirs to see",
		(section: SettingsSection) => {
			expect(offeredSections(accessWith([]), { section })).toEqual({
				...NOTHING,
				[section]: true,
			});
		}
	);

	it("offers Access roles with the read key anywhere, and not from a link alone", () => {
		expect(offeredSections(accessWith([], ["access_role:read"]), {})).toEqual({
			...NOTHING,
			access: true,
		});
		expect(offeredSections(accessWith([]), { section: "access" })).toEqual(
			NOTHING
		);
	});

	it("offers Data when one of its items is offered, and not from a link alone", () => {
		expect(
			offeredSections(accessWith([], ["member_profile:read"]), {})
		).toEqual({ ...NOTHING, data: true });
		expect(offeredSections(accessWith([]), { section: "data" })).toEqual(
			NOTHING
		);
	});
});
