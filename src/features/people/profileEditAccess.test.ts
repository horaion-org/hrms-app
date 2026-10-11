import { describe, expect, it } from "vitest";
import {
	personScope,
	profileEditAccess,
} from "@/features/people/profileEditAccess";
import type { ScopeRef } from "@/features/workspace/scopes";

const filed = { departmentId: "d-1" };
const unfiled = { departmentId: null };

/**
 * A `can` granting `member_profile:update` at these units; "" is a company
 * grant, which the API's workspace shows as effective at every unit too.
 */
const grantedAt =
	(...scopes: Array<string>) =>
	(permission: string, target: ScopeRef): boolean =>
		permission === "member_profile:update" &&
		(scopes.includes("") ||
			(target.kind !== "company" && scopes.includes(target.id)));

describe("profile edit access", () => {
	it("asks at the person's department, or at the company for someone without one", () => {
		expect(personScope(filed)).toEqual({ kind: "department", id: "d-1" });
		expect(personScope(unfiled)).toEqual({ kind: "company" });
	});

	it("is granted where the key is effective at the person's department", () => {
		expect(profileEditAccess(filed, grantedAt("d-1"))).toBe(true);
		expect(profileEditAccess(filed, grantedAt(""))).toBe(true);
	});

	it("is refused for a person in a department where the key isn't held", () => {
		expect(profileEditAccess(filed, grantedAt("d-2"))).toBe(false);
		expect(profileEditAccess(filed, () => false)).toBe(false);
	});

	it("needs the key at the company for a person without a department", () => {
		expect(profileEditAccess(unfiled, grantedAt(""))).toBe(true);
		expect(profileEditAccess(unfiled, grantedAt("d-2"))).toBe(false);
	});
});
