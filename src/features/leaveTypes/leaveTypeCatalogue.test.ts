import { describe, expect, it } from "vitest";
import {
	LEAVE_TYPE_CATALOGUE_FIXTURE,
	managedLeaveTypeFixture,
} from "@/features/leaveTypes/fixtures";
import {
	catalogueSections,
	hasKnownKind,
	movedOrder,
	statusToggleBody,
} from "@/features/leaveTypes/leaveTypeCatalogue";

const yearly = [
	managedLeaveTypeFixture({
		leaveTypeId: "a",
		name: "Annual leave",
		displayOrder: 1,
	}),
	managedLeaveTypeFixture({
		leaveTypeId: "old",
		name: "Old leave",
		displayOrder: 2,
		status: "INACTIVE",
	}),
	managedLeaveTypeFixture({
		leaveTypeId: "s",
		name: "Sick leave",
		displayOrder: 3,
	}),
	managedLeaveTypeFixture({
		leaveTypeId: "c",
		name: "Childcare leave",
		displayOrder: 4,
	}),
];

describe("catalogueSections", () => {
	it("splits the day off, the active types per kind in order and the inactive ones", () => {
		const sections = catalogueSections(LEAVE_TYPE_CATALOGUE_FIXTURE);
		expect(sections.system.map((type) => type.name)).toEqual(["Day off"]);
		expect(
			sections.groups.map((group) => [
				group.grantKind,
				group.types.map((type) => type.name),
			])
		).toEqual([
			["ALLOWANCE", ["Annual leave", "Sick leave"]],
			["PER_OCCASION", ["Marriage leave"]],
		]);
		expect(sections.inactive.map((type) => type.name)).toEqual(["Study leave"]);
	});

	it("lists a type of a kind the app does not know with the inactive ones, never in a group", () => {
		const sections = catalogueSections([
			managedLeaveTypeFixture({
				leaveTypeId: "e",
				name: "Earned",
				grantKind: "UNKNOWN",
			}),
		]);
		expect(sections.groups).toEqual([]);
		expect(sections.inactive.map((type) => type.leaveTypeId)).toEqual(["e"]);
	});
});

describe("movedOrder", () => {
	it("swaps a type with the active one above it and keeps the inactive ones last", () => {
		expect(movedOrder(yearly, "s", "up")).toEqual({
			grantKind: "ALLOWANCE",
			leaveTypeIds: ["s", "a", "c", "old"],
		});
		expect(movedOrder(yearly, "s", "down")).toEqual({
			grantKind: "ALLOWANCE",
			leaveTypeIds: ["a", "c", "s", "old"],
		});
	});

	it("offers no move past either end, for an inactive type or for the day off", () => {
		expect(movedOrder(yearly, "a", "up")).toBeNull();
		expect(movedOrder(yearly, "c", "down")).toBeNull();
		expect(movedOrder(yearly, "old", "up")).toBeNull();
		expect(movedOrder(LEAVE_TYPE_CATALOGUE_FIXTURE, "lt-off", "up")).toBeNull();
		expect(movedOrder(yearly, "missing", "up")).toBeNull();
	});
});

describe("statusToggleBody", () => {
	it("keeps every field and flips the status", () => {
		const study = LEAVE_TYPE_CATALOGUE_FIXTURE[3]!;
		if (!hasKnownKind(study)) throw new Error("fixture kind");
		expect(statusToggleBody(study)).toEqual({
			name: "Study leave",
			grantKind: "UNTRACKED",
			paid: false,
			requiresReason: true,
			allowsPartDays: true,
			appliesToBranchIds: [],
			appliesToDepartmentIds: [],
			status: "ACTIVE",
		});
		expect(statusToggleBody({ ...study, status: "ACTIVE" }).status).toBe(
			"INACTIVE"
		);
	});

	it("sends a type's departments and part-day switch back as they are", () => {
		const sick = LEAVE_TYPE_CATALOGUE_FIXTURE[1]!;
		if (!hasKnownKind(sick)) throw new Error("fixture kind");
		expect(statusToggleBody({ ...sick, allowsPartDays: false })).toMatchObject({
			allowsPartDays: false,
			appliesToBranchIds: [],
			appliesToDepartmentIds: ["d-kitchen"],
			status: "INACTIVE",
		});
	});
});
