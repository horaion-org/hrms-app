import { describe, expect, it } from "vitest";
import type {
	BranchChoice,
	DepartmentChoice,
} from "@/features/workspace/unitChoices";
import {
	ALL_BRANCHES,
	clearedUnits,
	resolveUnitSelection,
	sameUnits,
	selectedUnits,
	unitsNarrowed,
	urlUnitsOf,
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

const TABLE: UnitSelectionRules = {
	allowAllBranches: true,
	withDepartment: true,
};
const GRID: UnitSelectionRules = {
	allowAllBranches: false,
	withDepartment: true,
};
const FIRST_THEN_ALL: UnitSelectionRules = {
	allowAllBranches: true,
	startOnFirstBranch: true,
	withDepartment: true,
};
const BRANCH_ONLY: UnitSelectionRules = {
	allowAllBranches: true,
	withDepartment: false,
};

describe("resolveUnitSelection", () => {
	it("given_noUnitsRequested_when_allIsAllowed_then_showsEveryBranchAndWaitsForOneBeforeDepartments", () => {
		const resolved = resolveUnitSelection(
			[orchard, jurong],
			[kitchen, bar, floor],
			{},
			TABLE
		);

		expect(resolved.branch).toBeUndefined();
		expect(resolved.department).toBeUndefined();
		expect(resolved.branchMode).toBe("select");
		expect(resolved.departmentMode).toBe("disabled");
		expect(resolved.departments).toEqual([]);
	});

	it("given_noUnitsRequested_when_allIsNotAllowed_then_showsTheFirstBranch", () => {
		const resolved = resolveUnitSelection(
			[orchard, jurong],
			[kitchen, bar, floor],
			{},
			GRID
		);

		expect(resolved.branch).toBe(orchard);
		expect(resolved.departments).toEqual([kitchen, bar]);
		expect(resolved.departmentMode).toBe("select");
	});

	it("given_aBranchAndOneOfItsDepartments_when_resolved_then_showsBoth", () => {
		const resolved = resolveUnitSelection(
			[orchard, jurong],
			[kitchen, bar, floor],
			{ branchId: "b-1", departmentId: "d-2" },
			TABLE
		);

		expect(resolved.branch).toBe(orchard);
		expect(resolved.department).toBe(bar);
		expect(selectedUnits(resolved)).toEqual({
			branchId: "b-1",
			departmentId: "d-2",
		});
	});

	it("given_aDepartmentOfAnotherBranch_when_resolved_then_dropsIt", () => {
		const resolved = resolveUnitSelection(
			[orchard, jurong],
			[kitchen, bar, floor],
			{ branchId: "b-1", departmentId: "d-3" },
			TABLE
		);

		expect(resolved.department).toBeUndefined();
	});

	it("given_aBranchNoLongerOffered_when_resolved_then_fallsBackToTheDefault", () => {
		expect(
			resolveUnitSelection([orchard], [], { branchId: "gone" }, TABLE).branch
		).toBeUndefined();
		expect(
			resolveUnitSelection([orchard, jurong], [], { branchId: "gone" }, GRID)
				.branch
		).toBe(orchard);
	});

	it("given_oneBranchInReach_when_allIsNotAllowed_then_showsItAsText", () => {
		expect(
			resolveUnitSelection([orchard], [kitchen, bar], {}, GRID).branchMode
		).toBe("static");
	});

	it("given_oneBranchInReach_when_allIsAllowed_then_stillOffersAll", () => {
		expect(
			resolveUnitSelection([orchard], [kitchen, bar], {}, TABLE).branchMode
		).toBe("select");
	});

	it("given_oneDepartmentInTheBranch_when_resolved_then_showsItAsText", () => {
		expect(
			resolveUnitSelection([jurong], [floor], { branchId: "b-2" }, TABLE)
				.departmentMode
		).toBe("static");
	});

	it("given_noDepartmentInTheBranch_when_resolved_then_hidesTheDepartmentLevel", () => {
		expect(
			resolveUnitSelection([orchard], [], { branchId: "b-1" }, TABLE)
				.departmentMode
		).toBe("hidden");
	});

	it("given_noBranchInReach_when_resolved_then_hidesBothLevels", () => {
		const resolved = resolveUnitSelection([], [], {}, TABLE);

		expect(resolved.branchMode).toBe("hidden");
		expect(resolved.departmentMode).toBe("hidden");
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

describe("unitsNarrowed and clearedUnits", () => {
	it("given_everyBranch_when_allIsAllowed_then_isNotNarrowed", () => {
		const resolved = resolveUnitSelection([orchard, jurong], [], {}, TABLE);

		expect(unitsNarrowed(resolved)).toBe(false);
	});

	it("given_aBranch_when_allIsAllowed_then_isNarrowedAndClearsToEveryBranch", () => {
		const resolved = resolveUnitSelection(
			[orchard, jurong],
			[kitchen, bar],
			{ branchId: "b-1", departmentId: "d-1" },
			TABLE
		);

		expect(unitsNarrowed(resolved)).toBe(true);
		expect(clearedUnits(resolved)).toEqual({});
	});

	it("given_thePinnedBranch_when_allIsNotAllowed_then_onlyTheDepartmentNarrowsAndClearingKeepsTheBranch", () => {
		const pinned = resolveUnitSelection(
			[orchard, jurong],
			[kitchen, bar],
			{ branchId: "b-1" },
			GRID
		);
		const narrowed = resolveUnitSelection(
			[orchard, jurong],
			[kitchen, bar],
			{ branchId: "b-1", departmentId: "d-1" },
			GRID
		);

		expect(unitsNarrowed(pinned)).toBe(false);
		expect(unitsNarrowed(narrowed)).toBe(true);
		expect(clearedUnits(narrowed)).toEqual({ branchId: "b-1" });
	});
});

describe("sameUnits", () => {
	it("given_twoSelections_when_compared_then_matchesOnBothIds", () => {
		expect(sameUnits({ branchId: "b-1" }, { branchId: "b-1" })).toBe(true);
		expect(
			sameUnits({ branchId: "b-1" }, { branchId: "b-1", departmentId: "d-1" })
		).toBe(false);
	});
});

describe("a page that starts on its first Branch but offers All branches", () => {
	it("given_noBranchRequested_when_resolved_then_showsTheFirstBranch", () => {
		const resolved = resolveUnitSelection(
			[orchard, jurong],
			[kitchen, bar, floor],
			{},
			FIRST_THEN_ALL
		);

		expect(resolved.branch).toBe(orchard);
		expect(resolved.branchMode).toBe("select");
		expect(unitsNarrowed(resolved)).toBe(false);
	});

	it("given_allBranchesRequested_when_resolved_then_showsEveryBranchAndNamesItInTheUrlOnly", () => {
		const resolved = resolveUnitSelection(
			[orchard, jurong],
			[kitchen, bar, floor],
			{ branchId: ALL_BRANCHES },
			FIRST_THEN_ALL
		);

		expect(resolved.branch).toBeUndefined();
		expect(selectedUnits(resolved)).toEqual({
			branchId: undefined,
			departmentId: undefined,
		});
		expect(urlUnitsOf(resolved)).toEqual({
			branchId: ALL_BRANCHES,
			departmentId: undefined,
		});
		expect(unitsNarrowed(resolved)).toBe(true);
		expect(clearedUnits(resolved)).toEqual({});
	});

	it("given_allBranchesRequested_when_allIsNotAllowed_then_fallsBackToTheFirstBranch", () => {
		expect(
			resolveUnitSelection(
				[orchard, jurong],
				[],
				{ branchId: ALL_BRANCHES },
				GRID
			).branch
		).toBe(orchard);
	});

	it("given_anotherBranch_when_resolved_then_isNarrowed", () => {
		expect(
			unitsNarrowed(
				resolveUnitSelection(
					[orchard, jurong],
					[],
					{ branchId: "b-2" },
					FIRST_THEN_ALL
				)
			)
		).toBe(true);
	});
});
