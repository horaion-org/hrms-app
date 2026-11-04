import { describe, expect, it } from "vitest";
import type {
	BranchChoice,
	DepartmentChoice,
} from "@/features/workspace/unitChoices";
import {
	ALL_BRANCHES,
	offersAllBranches,
	resolveUnitSelection,
	selectedUnits,
	staleBranch,
	type UnitSelectionRules,
} from "@/features/workspace/unitSelection";

const orchard: BranchChoice = {
	branchId: "b-1",
	name: "Orchard",
	country: "SG",
	status: "ACTIVE",
};
const jurong: BranchChoice = {
	branchId: "b-2",
	name: "Jurong",
	country: "SG",
	status: "ACTIVE",
};
const department = (
	departmentId: string,
	name: string,
	branch: BranchChoice
): DepartmentChoice => ({
	departmentId,
	name,
	branchId: branch.branchId,
	branchName: branch.name,
	country: branch.country,
	status: "ACTIVE",
});
const kitchen = department("d-1", "Kitchen", orchard);
const bar = department("d-2", "Bar", orchard);
const floor = department("d-3", "Floor", jurong);

const WITH_DEPARTMENT: UnitSelectionRules = { withDepartment: true };
const BRANCH_ONLY: UnitSelectionRules = { withDepartment: false };

describe("resolveUnitSelection: the default Branch", () => {
	it("given_noBranchRequested_when_thePersonHasAHomeBranch_then_showsIt", () => {
		const resolved = resolveUnitSelection(
			[orchard, jurong],
			[kitchen, bar, floor],
			{},
			WITH_DEPARTMENT,
			"b-1"
		);

		expect(resolved.branch).toBe(orchard);
		expect(resolved.departments).toEqual([kitchen, bar]);
	});

	it("given_noBranchRequested_when_thePersonHasNoHomeBranch_then_showsTheFirstByName", () => {
		const resolved = resolveUnitSelection(
			[orchard, jurong],
			[kitchen, bar, floor],
			{},
			WITH_DEPARTMENT
		);

		expect(resolved.branch).toBe(jurong);
		expect(resolved.departments).toEqual([floor]);
	});

	it("given_aHomeBranchOutOfReach_when_resolved_then_showsTheFirstByName", () => {
		expect(
			resolveUnitSelection([orchard, jurong], [], {}, BRANCH_ONLY, "b-9").branch
		).toBe(jurong);
	});

	it("given_aBranchNoLongerOffered_when_resolved_then_fallsBackToTheDefault", () => {
		expect(
			resolveUnitSelection(
				[orchard, jurong],
				[],
				{ branchId: "gone" },
				BRANCH_ONLY,
				"b-1"
			).branch
		).toBe(orchard);
	});
});

describe("resolveUnitSelection: All branches", () => {
	it("given_allRequested_when_severalBranchesAreInReach_then_showsEveryBranchAndSendsNoBranch", () => {
		const resolved = resolveUnitSelection(
			[orchard, jurong],
			[kitchen, bar, floor],
			{ branchId: ALL_BRANCHES },
			WITH_DEPARTMENT,
			"b-1"
		);

		expect(resolved.branch).toBeUndefined();
		expect(selectedUnits(resolved)).toEqual({
			branchId: undefined,
			departmentId: undefined,
		});
	});

	it("given_allRequested_when_oneBranchIsInReach_then_showsThatBranch", () => {
		expect(
			resolveUnitSelection(
				[orchard],
				[kitchen],
				{ branchId: ALL_BRANCHES },
				WITH_DEPARTMENT
			).branch
		).toBe(orchard);
	});

	it("given_severalBranches_when_offered_then_allIsOffered", () => {
		expect(offersAllBranches([orchard, jurong])).toBe(true);
		expect(offersAllBranches([orchard])).toBe(false);
	});
});

describe("resolveUnitSelection: the Department", () => {
	it("given_allBranches_when_resolved_then_offersEveryDepartmentInReach", () => {
		const resolved = resolveUnitSelection(
			[orchard, jurong],
			[kitchen, bar, floor],
			{ branchId: ALL_BRANCHES, departmentId: "d-3" },
			WITH_DEPARTMENT
		);

		expect(resolved.departments).toEqual([kitchen, bar, floor]);
		expect(resolved.departmentMode).toBe("select");
		expect(resolved.department).toBe(floor);
		expect(selectedUnits(resolved)).toEqual({
			branchId: undefined,
			departmentId: "d-3",
		});
	});

	it("given_aBranchAndOneOfItsDepartments_when_resolved_then_showsBoth", () => {
		const resolved = resolveUnitSelection(
			[orchard, jurong],
			[kitchen, bar, floor],
			{ branchId: "b-1", departmentId: "d-2" },
			WITH_DEPARTMENT
		);

		expect(resolved.branch).toBe(orchard);
		expect(resolved.department).toBe(bar);
		expect(selectedUnits(resolved)).toEqual({
			branchId: "b-1",
			departmentId: "d-2",
		});
	});

	it("given_aDepartmentOfAnotherBranch_when_resolved_then_dropsIt", () => {
		expect(
			resolveUnitSelection(
				[orchard, jurong],
				[kitchen, bar, floor],
				{ branchId: "b-1", departmentId: "d-3" },
				WITH_DEPARTMENT
			).department
		).toBeUndefined();
	});

	it("given_oneDepartmentInTheBranch_when_resolved_then_showsItAsText", () => {
		expect(
			resolveUnitSelection(
				[jurong],
				[floor],
				{ branchId: "b-2" },
				WITH_DEPARTMENT
			).departmentMode
		).toBe("static");
	});

	it("given_noDepartmentInTheBranch_when_resolved_then_hidesTheDepartmentLevel", () => {
		expect(
			resolveUnitSelection([orchard], [], { branchId: "b-1" }, WITH_DEPARTMENT)
				.departmentMode
		).toBe("hidden");
	});

	it("given_aBranchOnlyList_when_aDepartmentIsRequested_then_ignoresIt", () => {
		const resolved = resolveUnitSelection(
			[orchard],
			[kitchen, bar],
			{ branchId: "b-1", departmentId: "d-1" },
			BRANCH_ONLY
		);

		expect(resolved.department).toBeUndefined();
		expect(resolved.departmentMode).toBe("hidden");
	});
});

describe("resolveUnitSelection: how the Branch is shown", () => {
	it("given_oneBranchInReach_when_resolved_then_showsItAsText", () => {
		expect(
			resolveUnitSelection([orchard], [kitchen, bar], {}, WITH_DEPARTMENT)
				.branchMode
		).toBe("static");
	});

	it("given_severalBranches_when_resolved_then_offersAChoice", () => {
		expect(
			resolveUnitSelection([orchard, jurong], [], {}, BRANCH_ONLY).branchMode
		).toBe("select");
	});

	it("given_noBranchInReach_when_resolved_then_hidesBothLevels", () => {
		const resolved = resolveUnitSelection([], [], {}, WITH_DEPARTMENT);

		expect(resolved.branchMode).toBe("hidden");
		expect(resolved.departmentMode).toBe("hidden");
	});
});

describe("staleBranch", () => {
	const resolved = resolveUnitSelection([orchard, jurong], [], {}, BRANCH_ONLY);

	it("given_noChoiceAllOrAnOfferedBranch_when_checked_then_isNotStale", () => {
		expect(staleBranch(resolved, {})).toBe(false);
		expect(staleBranch(resolved, { branchId: ALL_BRANCHES })).toBe(false);
		expect(staleBranch(resolved, { branchId: "b-2" })).toBe(false);
	});

	it("given_aBranchThePageDoesNotOffer_when_checked_then_isStale", () => {
		expect(staleBranch(resolved, { branchId: "gone" })).toBe(true);
	});
});
