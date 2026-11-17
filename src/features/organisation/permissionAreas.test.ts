import { describe, expect, it } from "vitest";
import { APPROVAL_READ_KEYS } from "@/features/dashboard/api";
import {
	AREAS,
	areaOf,
	isSettingsArea,
	keysOfArea,
	PERMISSION_AREAS,
	type PermissionArea,
} from "@/features/organisation/permissionAreas";
import { SCHEDULING_KEYS } from "@/features/scheduling/schedulingSearch";
import {
	AVAILABILITY_READ_KEYS,
	LEAVE_READ_KEYS,
	MEMBER_EVENT_READ_KEYS,
	ORGANISATION_READ_KEYS,
	PEOPLE_READ_KEYS,
	PERMISSION_KEYS,
	type PermissionKey,
	REPORT_READ_KEYS,
	resourceOf,
	SHIFT_PREFERENCE_READ_KEYS,
} from "@/features/workspace/permissionKeys";

describe("the role editor's areas", () => {
	it("follow the menu's order, Settings last", () => {
		expect(AREAS).toEqual([
			"dashboard",
			"scheduling",
			"leave",
			"shiftPreferences",
			"availability",
			"people",
			"organisation",
			"reports",
			"settingsCompany",
			"settingsEmployment",
			"settingsWorkPolicy",
			"settingsLeave",
			"settingsApprovals",
			"settingsAccess",
		]);
		expect(AREAS.filter(isSettingsArea)).toHaveLength(6);
	});

	it("hold every resource of the catalogue exactly once", () => {
		const listed = PERMISSION_AREAS.flatMap(({ resources }) => resources);
		expect(new Set(listed).size).toBe(listed.length);
		expect([...listed].sort()).toEqual(
			[...new Set(PERMISSION_KEYS.map(resourceOf))].sort()
		);
		expect(AREAS.flatMap(keysOfArea).sort()).toEqual(
			[...PERMISSION_KEYS].sort()
		);
	});

	it("hold the keys that open each menu entry, so a level opens its screen", () => {
		const gates: Array<[PermissionArea, ReadonlyArray<PermissionKey>]> = [
			["dashboard", [...APPROVAL_READ_KEYS, ...MEMBER_EVENT_READ_KEYS]],
			["scheduling", SCHEDULING_KEYS],
			["leave", LEAVE_READ_KEYS],
			["shiftPreferences", SHIFT_PREFERENCE_READ_KEYS],
			["availability", AVAILABILITY_READ_KEYS],
			["people", PEOPLE_READ_KEYS],
			["organisation", ORGANISATION_READ_KEYS],
			["reports", REPORT_READ_KEYS],
		];
		for (const [area, keys] of gates)
			for (const key of keys) expect([key, areaOf(key)]).toEqual([key, area]);
	});

	it("put Reports and Shift preferences in areas of their own", () => {
		expect(keysOfArea("reports")).toEqual(["report:read"]);
		expect(keysOfArea("shiftPreferences")).toEqual([
			"shift_preference:read",
			"shift_preference:update",
		]);
		expect(areaOf("leave_duration:update")).toBe("settingsLeave");
		expect(areaOf("audit_event:read")).toBe("organisation");
	});
});
