import { describe, expect, it } from "vitest";
import {
	personScope,
	profileEditAccess,
} from "@/features/people/profileEditAccess";

const filed = { departmentId: "d-1" };
const unfiled = { departmentId: null };

/** A `can` granting `member_profile:update` at these scopes; "" is the company. */
const grantedAt =
	(...scopes: Array<string>) =>
	(permission: string, scopeId = ""): boolean =>
		permission === "member_profile:update" &&
		(scopes.includes("") || scopes.includes(scopeId));

describe("profile edit access", () => {
	it("asks at the person's department, or at the company for someone without one", () => {
		expect(personScope(filed)).toBe("d-1");
		expect(personScope(unfiled)).toBeUndefined();
	});

	it("is granted at the person's department, or above it", () => {
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
