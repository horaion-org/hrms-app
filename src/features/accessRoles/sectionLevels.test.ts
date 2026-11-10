import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	roleSummaryText,
	sectionLevels,
} from "@/features/accessRoles/sectionLevels";
import { moduleOf, PERMISSION_KEYS } from "@/features/workspace/permissionKeys";

const t = authTestI18n.t.bind(authTestI18n);

describe("a role's summary, section by section", () => {
	it("is View with only reads, Manage with any change, and Full with every key of the section", () => {
		expect(sectionLevels(["shift:read", "schedule:read"])).toEqual([
			{ module: "scheduling", level: "VIEW", resources: ["schedule", "shift"] },
		]);
		expect(sectionLevels(["schedule:read", "schedule:publish"])).toEqual([
			{ module: "scheduling", level: "MANAGE", resources: ["schedule"] },
		]);
		expect(
			sectionLevels(PERMISSION_KEYS.filter((key) => moduleOf(key) === "leave"))
		).toEqual([
			{ module: "leave", level: "FULL", resources: ["leave_request"] },
		]);
	});

	it("lists sections in the contract's order and leaves out those with nothing held", () => {
		expect(
			sectionLevels([
				"audit_event:read",
				"member_profile:read",
				"branch:read",
			]).map((summary) => summary.module)
		).toEqual(["people", "organisation", "access_and_activity"]);
		expect(sectionLevels([])).toEqual([]);
	});

	it("reads as one line, section by section", () => {
		expect(
			roleSummaryText(
				["member_profile:read", "schedule:read", "schedule:generate"],
				t
			)
		).toBe("People: View · Scheduling: Manage");
		expect(roleSummaryText([], t)).toBe("");
	});
});
