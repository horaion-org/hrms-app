import { describe, expect, it } from "vitest";
import { placeKey, scopeOfPlace } from "@/features/workspace/places";
import { COMPANY_SCOPE, departmentScope } from "@/features/workspace/scopes";

describe("places", () => {
	it("reads a place the API sends with null ids", () => {
		const place = { branchId: null, departmentId: "d-1" };
		expect(placeKey(place)).toBe("d-1");
		expect(scopeOfPlace(place)).toEqual(departmentScope("d-1"));
		expect(placeKey({ branchId: null, departmentId: null })).toBe("");
		expect(scopeOfPlace({ branchId: null, departmentId: null })).toEqual(
			COMPANY_SCOPE
		);
	});
});
