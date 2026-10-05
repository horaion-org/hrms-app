import { describe, expect, it } from "vitest";
import {
	DepartmentIcon,
	OrganisationIcon,
	PermissionsIcon,
	RoleIcon,
	UserIcon,
} from "@/components/ui/Icon";
import { authTestI18n } from "@/features/auth/testingI18n";
import { describeActivity, timeAgo } from "@/features/organisation/activity";
import type { AuditEvent } from "@/features/organisation/api";

const event = (overrides: Partial<AuditEvent>): AuditEvent => ({
	auditEventId: "e-1",
	action: "branch.create",
	entityType: "Branch",
	entityId: "b-1",
	entityName: "Orchard",
	actorDisplayName: "Aisha Rahman",
	occurredAt: "2026-10-03T08:00:00Z",
	...overrides,
});

describe("describeActivity", () => {
	const t = authTestI18n.t;

	it.each([
		["branch.create", "Branch created: Orchard", OrganisationIcon],
		["branch.update", "Branch updated: Orchard", OrganisationIcon],
		["department.create", "Department created: Orchard", DepartmentIcon],
		["department.update", "Department updated: Orchard", DepartmentIcon],
		["job_title.create", "Job title created: Orchard", RoleIcon],
		["job_title.update", "Job title updated: Orchard", RoleIcon],
		["access_role.create", "Role created: Orchard", UserIcon],
		[
			"access_role.update",
			"Permissions updated for Orchard role",
			PermissionsIcon,
		],
		["access_role.delete", "Role deleted: Orchard", UserIcon],
	])("words %s as %s", (action, title, icon) => {
		expect(describeActivity(event({ action }), t)).toEqual({
			id: "e-1",
			icon,
			title,
		});
	});

	it("drops the name when the entity no longer resolves", () => {
		expect(
			describeActivity(
				event({ action: "access_role.delete", entityName: null }),
				t
			)?.title
		).toBe("Role deleted");
	});

	it("skips actions it does not describe", () => {
		expect(
			describeActivity(event({ action: "branch_member.add" }), t)
		).toBeUndefined();
	});
});

describe("timeAgo", () => {
	const now = new Date("2026-10-03T12:00:00Z");

	it.each([
		["2026-10-03T11:59:30Z", undefined],
		["2026-10-03T11:58:00Z", "2 minutes ago"],
		["2026-10-03T10:00:00Z", "2 hours ago"],
		["2026-10-02T09:00:00Z", "Yesterday"],
		["2026-09-28T12:00:00Z", "5 days ago"],
		["2026-09-12T12:00:00Z", "3 weeks ago"],
		["2026-06-01T12:00:00Z", "4 months ago"],
		["2024-10-01T12:00:00Z", "2 years ago"],
		["2026-10-03T12:05:00Z", undefined],
	])("reads %s as %s", (occurredAt, expected) => {
		expect(timeAgo(occurredAt, now, "en")).toBe(expected);
	});

	it("capitalises in the given locale", () => {
		expect(timeAgo("2026-10-02T09:00:00Z", now, "es")).toBe("Ayer");
	});
});
