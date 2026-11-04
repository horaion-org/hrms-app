import { describe, expect, it } from "vitest";
import { dataItemsFor, offersData } from "@/features/settings/dataAccess";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import type { ScopeRef } from "@/features/workspace/scopes";

/** Access holding `companyKeys` company-wide and `unitKeys` only in some unit. */
const accessWith = (
	companyKeys: Array<PermissionKey>,
	unitKeys: Array<PermissionKey> = []
): Parameters<typeof dataItemsFor>[0] => ({
	can: (permission: PermissionKey, target: ScopeRef) =>
		target.kind === "company" && companyKeys.includes(permission),
	canAnywhere: (permission: PermissionKey) =>
		companyKeys.includes(permission) || unitKeys.includes(permission),
});

describe("dataItemsFor", () => {
	it("offers each item on its own key, the organisation import only company-wide", () => {
		expect(dataItemsFor(accessWith(["branch:create"]))).toEqual({
			importOrganisation: true,
			importPeople: false,
			exportPeople: false,
			importHistory: true,
		});
		expect(dataItemsFor(accessWith([], ["branch:create"]))).toEqual({
			importOrganisation: false,
			importPeople: false,
			exportPeople: false,
			importHistory: false,
		});
		expect(
			dataItemsFor(
				accessWith([], ["member_profile:create", "member_profile:read"])
			)
		).toEqual({
			importOrganisation: false,
			importPeople: true,
			exportPeople: true,
			importHistory: true,
		});
	});

	it("offers the section with any item, and only the export to a reader", () => {
		const reader = dataItemsFor(accessWith([], ["member_profile:read"]));
		expect(reader.importHistory).toBe(false);
		expect(offersData(reader)).toBe(true);
		expect(offersData(dataItemsFor(accessWith(["branch:read"])))).toBe(false);
	});
});
