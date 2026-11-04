import { describe, expect, it } from "vitest";
import {
	parseBranchContext,
	unitSearchOf,
	unitSearchSchema,
	unitSelectionOf,
} from "@/features/workspace/unitSearch";

describe("unitSearchSchema", () => {
	it("given_unitIds_when_parsed_then_keepsThem", () => {
		expect(
			unitSearchSchema.parse({ branch: "b-1", department: "d-1" })
		).toEqual({ branch: "b-1", department: "d-1" });
	});

	it("given_emptyOrMalformedIds_when_parsed_then_dropsThem", () => {
		expect(unitSearchSchema.parse({ branch: "", department: 7 })).toEqual({
			branch: undefined,
			department: undefined,
		});
	});
});

describe("unitSearchOf", () => {
	it("given_unsetUnits_when_read_then_leavesTheirKeysOut", () => {
		expect(unitSearchOf({ branch: undefined, department: undefined })).toEqual(
			{}
		);
		expect(unitSearchOf({ branch: "b-1", department: undefined })).toEqual({
			branch: "b-1",
		});
	});
});

describe("unitSelectionOf", () => {
	it("given_theUrlUnits_when_read_then_namesThemAsASelection", () => {
		expect(unitSelectionOf({ branch: "b-1", department: "d-1" })).toEqual({
			branchId: "b-1",
			departmentId: "d-1",
		});
	});
});

describe("parseBranchContext", () => {
	it("given_anySignedInUrl_when_parsed_then_keepsOnlyTheBranch", () => {
		expect(
			parseBranchContext({ branch: "b-1", department: "d-1", view: "team" })
		).toEqual({ branch: "b-1" });
		expect(parseBranchContext({ branch: "" })).toEqual({});
	});
});
