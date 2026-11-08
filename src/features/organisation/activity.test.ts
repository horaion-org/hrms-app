import { createInstance, type TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import {
	DepartmentIcon,
	EmailIcon,
	GenerateScheduleIcon,
	HistoryIcon,
	LeaveIcon,
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
	"organisationImported",
	"workspaceCreated",
	"workspaceRenamed",
	"memberUpdated",
	"memberEmailChanged",
	"memberInvitationResent",
	"memberSkillsUpdated",
	"skillCreated",
	"skillUpdated",
	"skillDeleted",
	"skillAssigned",
	"memberAvailabilityUpdated",
	"memberWeekAvailabilityUpdated",
	"memberWeekAvailabilityCleared",
	"scheduleCreated",
	"scheduleUpdated",
	"scheduleGenerationRequested",
	"scheduleRegenerationRequested",
	"scheduleGenerated",
	"scheduleDeleted",
	"schedulingPolicyCreated",
	"schedulingPolicyUpdated",
	"schedulingPolicyDeleted",
	"leaveTypeCreated",
	"leaveTypeUpdated",
	"leaveTypesReordered",
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
		["skill.create", "Skill created: Orchard", SkillsIcon],
		["skill.update", "Skill updated: Orchard", SkillsIcon],
		["skill.delete", "Skill deleted: Orchard", SkillsIcon],
		[
			"scheduling_policy.create",
			"Scheduling policy constraint added: Orchard",
			SchedulingIcon,
		],
		[
			"scheduling_policy.delete",
			"Scheduling policy constraint removed: Orchard",
			SchedulingIcon,
		],
		[
			"member_skill.bulk_assign",
			"Skill assigned to people: Orchard",
			SkillsIcon,
		],
		["employment_terms.create", "Employment terms added: Orchard", TimeIcon],
		[
			"employment_terms.change_from_date",
			"Employment terms changed from a date: Orchard",
			TimeIcon,
		],
		["employment_terms.default", "Default employment terms: Orchard", TimeIcon],
		[
			"member_employment_terms.change",
			"Orchard’s employment terms changed",
			TimeIcon,
		],
		[
			"member_employment_terms.bulk_assign",
			"Employment terms given to several people: Orchard",
			TimeIcon,
		],
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
		["schedule.roster_change.apply", "Roster changed: Orchard", SchedulingIcon],
		[
			"schedule.roster_change.undo",
			"Roster change undone: Orchard",
			SchedulingIcon,
		],
		["organisation_import.complete", "Organisation imported", OrganisationIcon],
		["leave_type.create", "Leave type added: Orchard", LeaveIcon],
		["leave_type.update", "Leave type changed: Orchard", LeaveIcon],
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
		["schedule.roster_change.apply", "Roster changed"],
		["member_skill.replace", "Employee skills updated"],
		["skill.delete", "Skill deleted"],
		["scheduling_policy.update", "Scheduling policy constraint changed"],
		["member_skill.bulk_assign", "Skill assigned to people"],
		["employment_terms.status", "Employment terms status changed"],
		[
			"member_employment_terms.cancel",
			"Employment terms change cancelled for someone",
		],
		["organisation_import.complete", "Organisation imported"],
		["leave_type.update", "Leave type changed"],
		["leave_type.reorder", "Leave types reordered"],
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

	it("words an action without its own copy from its verb and entity type", () => {
		expect(
			describeActivity(
				event({
					action: "shift.create",
					entityType: "Shift",
					entityName: "Front desk",
				}),
				t
			)
		).toEqual({
			id: "e-1",
			icon: HistoryIcon,
			title: "Shift created: Front desk",
		});
	});

	it.each([
		["shift.delete", "Shift", "Shift deleted"],
		["branch_member.add", "BranchMembership", "Branch membership added"],
		[
			"branch_member.ensure_active",
			"BranchMembership",
			"Branch membership activated",
		],
		["approval.start", "ApprovalInstance", "Approval started"],
		["approval_flow.update", "ApprovalFlow", "Approval flow updated"],
		["schedule.publish", "Schedule", "Schedule published"],
		["widget.frobnicate", "WidgetThing", "Widget thing frobnicate"],
	])(
		"falls back for %s on %s as %s, humanising what it does not know",
		(action, entityType, title) => {
			expect(
				describeActivity(event({ action, entityType, entityName: null }), t)
					.title
			).toBe(title);
		}
	);

	it("words the fallback in Spanish", () => {
		const spanish = createInstance();
		void spanish.init({
			lng: "es",
			fallbackLng: "en",
			resources: { en: { translation: en }, es: { translation: es } },
			interpolation: { escapeValue: false },
		});
		expect(
			describeActivity(
				event({
					action: "shift.create",
					entityType: "Shift",
					entityName: "Front desk",
				}),
				spanish.t
			).title
		).toBe("Creación de turno: Front desk");
		expect(
			describeActivity(
				event({
					action: "schedule.publish",
					entityType: "Schedule",
					entityName: "Ops approvals week",
				}),
				spanish.t
			).title
		).toBe("Publicación de horario: Ops approvals week");
		expect(
			describeActivity(
				event({
					action: "approval.start",
					entityType: "ApprovalInstance",
					entityName: "Ops approvals week",
				}),
				spanish.t
			).title
		).toBe("Inicio de aprobación: Ops approvals week");
	});

	/** The API's audited actions that have no copy of their own, so the fallback words them. */
	const FALLBACK_ACTIONS = [
		["approval.cancel", "ApprovalInstance"],
		["approval.decide", "ApprovalInstance"],
		["approval.start", "ApprovalInstance"],
		["approval_flow.create", "ApprovalFlow"],
		["approval_flow.delete", "ApprovalFlow"],
		["approval_flow.update", "ApprovalFlow"],
		["branch_member.add", "BranchMembership"],
		["branch_member.deactivate", "BranchMembership"],
		["branch_member.ensure_active", "BranchMembership"],
		["branch_member.update", "BranchMembership"],
		["constraint.create", "Constraint"],
		["constraint.delete", "Constraint"],
		["constraint.update", "Constraint"],
		["department_member.deactivate", "DepartmentMembership"],
		["leave_request.cancel", "LeaveRequest"],
		["leave_request.change", "LeaveRequest"],
		["leave_request.record", "LeaveRequest"],
		["leave_request.withdraw", "LeaveRequest"],
		["member_note.create", "MemberNote"],
		["member_note.delete", "MemberNote"],
		["member_note.update", "MemberNote"],
		["schedule.cover_offer.accept", "CoverOffer"],
		["schedule.cover_offer.decline", "CoverOffer"],
		["schedule.cover_offer.record", "CoverOffer"],
		["schedule.cover_offer.send", "CoverOffer"],
		["schedule.cover_offer.withdraw", "CoverOffer"],
		["schedule.opening_balances.update", "Schedule"],
		["schedule.publication_withdraw", "Schedule"],
		["schedule.publish", "Schedule"],
		["schedule.reject", "Schedule"],
		["schedule.roster_change.cover_option", "ScheduleRosterChange"],
		["schedule.roster_change.leave_removal", "ScheduleRosterChange"],
		["schedule.starting_days.update", "Schedule"],
		["shift.create", "Shift"],
		["shift.delete", "Shift"],
		["shift.update", "Shift"],
	] as const;

	it.each(FALLBACK_ACTIONS)(
		"words %s on %s from the app's own verb and entity copy, in both languages",
		(action, entityType) => {
			const asked: Array<string> = [];
			const recording = ((key: string) => {
				asked.push(key);
				return key;
			}) as unknown as TFunction;
			describeActivity(event({ action, entityType }), recording);

			const verb = asked.find((key) => key.includes(".activity.verbs."));
			const entity = asked.find((key) =>
				key.includes(".activity.entityTypes.")
			);
			expect(verb, "verb copy").toBeDefined();
			expect(entity, "entity copy").toBeDefined();
			for (const language of ["en", "es"] as const) {
				const { verbs, entityTypes } = LOCALES[language].organisation.activity;
				expect(verbs).toHaveProperty(verb!.split(".").pop()!);
				expect(entityTypes).toHaveProperty(entity!.split(".").pop()!);
			}
		}
	);

	it.each([
		[
			"AccessRole",
			"access_role.update",
			{ kind: "accessRole", accessRoleId: "e-9" },
		],
		[
			"MemberProfile",
			"member_skill.replace",
			{ kind: "member", membershipId: "e-9" },
		],
	])("links a live %s to its page", (entityType, action, link) => {
		expect(
			describeActivity(event({ action, entityType, entityId: "e-9" }), t).link
		).toEqual(link);
	});

	it.each([
		["a schedule, whose page also needs its department", "Schedule", "Week 45"],
		["an entity that no longer resolves", "AccessRole", null],
		["a branch, which has no page of its own", "Branch", "Orchard"],
	])("leaves %s unlinked", (_, entityType, entityName) => {
		expect(
			describeActivity(event({ action: "x.update", entityType, entityName }), t)
				.link
		).toBeUndefined();
	});
});
