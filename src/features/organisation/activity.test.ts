import { describe, expect, it } from "vitest";
import {
	DepartmentIcon,
	EmailIcon,
	GenerateScheduleIcon,
	OrganisationIcon,
	PermissionsIcon,
	RoleIcon,
	SchedulingIcon,
	SkillsIcon,
	TimeIcon,
	UserIcon,
} from "@/components/ui/Icon";
import en from "@/assets/locales/en/translations.json";
import es from "@/assets/locales/es/translations.json";
import { authTestI18n } from "@/features/auth/testingI18n";
import { describeActivity } from "@/features/organisation/activity";
import type { AuditEvent } from "@/features/organisation/api";

const LOCALES = { en, es };

/** Spanish is partial elsewhere in the feed; these activities ship with both languages from the start. */
const WORKSPACE_PROFILE_AND_SCHEDULE_KEYS = [
	"workspaceCreated",
	"workspaceRenamed",
	"memberUpdated",
	"memberEmailChanged",
	"memberInvitationResent",
	"memberSkillsUpdated",
	"memberAvailabilityUpdated",
	"memberWeekAvailabilityUpdated",
	"memberWeekAvailabilityCleared",
	"scheduleCreated",
	"scheduleUpdated",
	"scheduleGenerationRequested",
	"scheduleRegenerationRequested",
	"scheduleGenerated",
	"scheduleDeleted",
];

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
		["company.onboard", "Workspace created: Orchard", OrganisationIcon],
		["company.update", "Workspace renamed: Orchard", OrganisationIcon],
		["member_profile.update", "Orchard’s profile updated", UserIcon],
		["member_profile.email_change", "Orchard’s email changed", EmailIcon],
		[
			"member_profile.invitation_resend",
			"Invitation resent to Orchard",
			EmailIcon,
		],
		["member_skill.replace", "Orchard’s skills updated", SkillsIcon],
		["member_availability.replace", "Orchard’s availability updated", TimeIcon],
		[
			"member_availability.week_override.replace",
			"Orchard’s availability for a week updated",
			TimeIcon,
		],
		[
			"member_availability.week_override.delete",
			"Orchard’s availability for a week cleared",
			TimeIcon,
		],
		["schedule.create", "Schedule created: Orchard", SchedulingIcon],
		["schedule.update", "Schedule updated: Orchard", SchedulingIcon],
		[
			"schedule.generate",
			"Schedule generation requested: Orchard",
			GenerateScheduleIcon,
		],
		[
			"schedule.regenerate",
			"Schedule regeneration requested: Orchard",
			GenerateScheduleIcon,
		],
		["schedule.generated", "Schedule generated: Orchard", GenerateScheduleIcon],
		["schedule.delete", "Schedule deleted: Orchard", SchedulingIcon],
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

	it.each([
		["company.update", "Workspace renamed"],
		["schedule.delete", "Schedule deleted"],
		["schedule.regenerate", "Schedule regeneration requested"],
		["member_skill.replace", "Employee skills updated"],
	])("words %s without a name as %s", (action, title) => {
		expect(
			describeActivity(event({ action, entityName: null }), t)?.title
		).toBe(title);
	});

	it.each(["en", "es"] as const)(
		"has %s copy, named and unnamed, for the workspace, profile and schedule activities",
		(language) => {
			const { named, unnamed } = LOCALES[language].organisation.activity;
			for (const key of WORKSPACE_PROFILE_AND_SCHEDULE_KEYS) {
				expect(named).toHaveProperty(key);
				expect(unnamed).toHaveProperty(key);
			}
		}
	);

	it.each([
		"branch_member.add",
		"member_profile.read",
		"schedule.generation.failed",
	])("skips %s, which it does not describe", (action) => {
		expect(describeActivity(event({ action }), t)).toBeUndefined();
	});
});
