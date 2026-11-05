import { describe, expect, it } from "vitest";
import { fixedBranchOf } from "@/features/workspace/branchScope";

describe("fixedBranchOf", () => {
	it("given_aLoaderThatPinnedABranch_when_read_then_returnsIt", () => {
		expect(
			fixedBranchOf({ fixedBranch: { branchId: "b-1", name: "Orchard" } })
		).toEqual({ branchId: "b-1", name: "Orchard" });
	});

	it("given_loaderDataOfAnyOtherShape_when_read_then_returnsNone", () => {
		expect(fixedBranchOf(undefined)).toBeUndefined();
		expect(fixedBranchOf({})).toBeUndefined();
		expect(fixedBranchOf({ fixedBranch: undefined })).toBeUndefined();
		expect(fixedBranchOf({ fixedBranch: { branchId: 1 } })).toBeUndefined();
		expect(fixedBranchOf("Orchard")).toBeUndefined();
	});
});
