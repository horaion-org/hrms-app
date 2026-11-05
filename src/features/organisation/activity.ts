import type { TFunction } from "i18next";
import { timeAgo } from "@/common/relativeTime";
import type { Heroicon } from "@/common/types";
import {
	AddStaffIcon,
	DepartmentIcon,
	EmailIcon,
	GenerateScheduleIcon,
	HistoryIcon,
	LeaveIcon,
	OrganisationIcon,
	PermissionsIcon,
	RemoveUserIcon,
	RoleIcon,
	SchedulingIcon,
	SkillsIcon,
	TimeIcon,
	UserIcon,
} from "@/components/ui/Icon";
import type { AuditEvent } from "@/features/organisation/api";

type ActivityKey =
	| "workspaceCreated"
	| "workspaceRenamed"
	| "branchCreated"
	| "branchUpdated"
	| "departmentCreated"
	| "departmentUpdated"
	| "jobTitleCreated"
	| "jobTitleUpdated"
	| "organisationImported"
	| "roleCreated"
	| "roleUpdated"
	| "roleDeleted"
	| "memberAdded"
	| "memberDeactivated"
	| "memberReactivated"
	| "memberUpdated"
	| "memberEmailChanged"
	| "memberInvitationResent"
	| "memberSkillsUpdated"
	| "memberAvailabilityUpdated"
	| "memberWeekAvailabilityUpdated"
	| "memberWeekAvailabilityCleared"
	| "scheduleCreated"
	| "scheduleUpdated"
	| "scheduleGenerationRequested"
	| "scheduleRegenerationRequested"
	| "scheduleGenerated"
	| "scheduleDeleted"
	| "leaveRequested"
	| "leaveApproved"
	| "leaveRejected";

const ACTIVITIES: Record<string, { key: ActivityKey; icon: Heroicon }> = {
	"company.onboard": { key: "workspaceCreated", icon: OrganisationIcon },
	"company.update": { key: "workspaceRenamed", icon: OrganisationIcon },
	"branch.create": { key: "branchCreated", icon: OrganisationIcon },
	"branch.update": { key: "branchUpdated", icon: OrganisationIcon },
	"department.create": { key: "departmentCreated", icon: DepartmentIcon },
	"department.update": { key: "departmentUpdated", icon: DepartmentIcon },
	"job_title.create": { key: "jobTitleCreated", icon: RoleIcon },
	"job_title.update": { key: "jobTitleUpdated", icon: RoleIcon },
	// The import's own summary; each unit it created keeps its own item too.
	"organisation_import.complete": {
		key: "organisationImported",
		icon: OrganisationIcon,
	},
	"access_role.create": { key: "roleCreated", icon: UserIcon },
	"access_role.update": { key: "roleUpdated", icon: PermissionsIcon },
	"access_role.delete": { key: "roleDeleted", icon: UserIcon },
	"member_profile.create": { key: "memberAdded", icon: AddStaffIcon },
	"member_profile.deactivate": {
		key: "memberDeactivated",
		icon: RemoveUserIcon,
	},
	"member_profile.reactivate": { key: "memberReactivated", icon: UserIcon },
	"member_profile.update": { key: "memberUpdated", icon: UserIcon },
	"member_profile.email_change": { key: "memberEmailChanged", icon: EmailIcon },
	"member_profile.invitation_resend": {
		key: "memberInvitationResent",
		icon: EmailIcon,
	},
	"member_skill.replace": { key: "memberSkillsUpdated", icon: SkillsIcon },
	"member_availability.replace": {
		key: "memberAvailabilityUpdated",
		icon: TimeIcon,
	},
	"member_availability.week_override.replace": {
		key: "memberWeekAvailabilityUpdated",
		icon: TimeIcon,
	},
	"member_availability.week_override.delete": {
		key: "memberWeekAvailabilityCleared",
		icon: TimeIcon,
	},
	"leave_request.create": { key: "leaveRequested", icon: LeaveIcon },
	"leave_request.approve": { key: "leaveApproved", icon: LeaveIcon },
	"leave_request.reject": { key: "leaveRejected", icon: LeaveIcon },
	"schedule.create": { key: "scheduleCreated", icon: SchedulingIcon },
	"schedule.update": { key: "scheduleUpdated", icon: SchedulingIcon },
	"schedule.generate": {
		key: "scheduleGenerationRequested",
		icon: GenerateScheduleIcon,
	},
	"schedule.regenerate": {
		key: "scheduleRegenerationRequested",
		icon: GenerateScheduleIcon,
	},
	"schedule.generated": {
		key: "scheduleGenerated",
		icon: GenerateScheduleIcon,
	},
	"schedule.delete": { key: "scheduleDeleted", icon: SchedulingIcon },
};

type VerbKey =
	| "created"
	| "updated"
	| "deleted"
	| "added"
	| "deactivated"
	| "reactivated"
	| "granted"
	| "revoked"
	| "approved"
	| "rejected"
	| "started"
	| "finished";

/** The verb part of an action (`shift.create` → `create`) worded for the fallback title. */
const VERBS: Record<string, VerbKey> = {
	create: "created",
	update: "updated",
	replace: "updated",
	delete: "deleted",
	add: "added",
	deactivate: "deactivated",
	reactivate: "reactivated",
	grant: "granted",
	revoke: "revoked",
	approve: "approved",
	reject: "rejected",
	start: "started",
	finish: "finished",
};

type EntityTypeKey =
	| "Company"
	| "Branch"
	| "Department"
	| "AccessRole"
	| "AccessRoleAssignment"
	| "BranchMembership"
	| "DepartmentMembership"
	| "JobTitle"
	| "MemberProfile"
	| "MemberNote"
	| "MemberImportJob"
	| "Skill"
	| "LeaveRequest"
	| "Schedule"
	| "Shift"
	| "Constraint";

const ENTITY_TYPES: ReadonlySet<string> = new Set<EntityTypeKey>([
	"Company",
	"Branch",
	"Department",
	"AccessRole",
	"AccessRoleAssignment",
	"BranchMembership",
	"DepartmentMembership",
	"JobTitle",
	"MemberProfile",
	"MemberNote",
	"MemberImportJob",
	"Skill",
	"LeaveRequest",
	"Schedule",
	"Shift",
	"Constraint",
]);

/** Where an activity's entity opens, when the app has a page for it by id alone. */
export type ActivityLink =
	| { kind: "accessRole"; accessRoleId: string }
	| { kind: "member"; membershipId: string };

export type Activity = {
	id: string;
	icon: Heroicon;
	title: string;
	link?: ActivityLink;
};

const isEntityTypeKey = (entityType: string): entityType is EntityTypeKey =>
	ENTITY_TYPES.has(entityType);

/** `ensure_active` → `ensure active`; `MemberImportJob` → `Member import job`. */
const humanise = (code: string): string => {
	const words = code
		.replace(/_/g, " ")
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.toLowerCase();
	return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * The title for an action without its own copy: the entity type's label and
 * the action's verb, worded where the app knows them and humanised otherwise,
 * so a new backend action shows up instead of vanishing.
 */
const fallbackTitle = (event: AuditEvent, t: TFunction): string => {
	const rawVerb = event.action.slice(event.action.lastIndexOf(".") + 1);
	const verbKey = VERBS[rawVerb];
	const verb = verbKey
		? t(`organisation.activity.verbs.${verbKey}`)
		: humanise(rawVerb).toLowerCase();
	const entity = isEntityTypeKey(event.entityType)
		? t(`organisation.activity.entityTypes.${event.entityType}`)
		: humanise(event.entityType);
	return event.entityName === null
		? t("organisation.activity.fallback.unnamed", { entity, verb })
		: t("organisation.activity.fallback.named", {
				entity,
				verb,
				name: event.entityName,
			});
};

/**
 * The entity's page, for the kinds the app can open from an id alone and only
 * while the entity still resolves (a deleted role has no page to open).
 * Schedules are left plain: their page also needs the branch and department.
 */
const activityLink = (event: AuditEvent): ActivityLink | undefined => {
	if (event.entityId === null || event.entityName === null) return undefined;
	switch (event.entityType) {
		case "AccessRole":
			return { kind: "accessRole", accessRoleId: event.entityId };
		case "MemberProfile":
			return { kind: "member", membershipId: event.entityId };
		default:
			return undefined;
	}
};

/** How an audit event reads in Recent Activity: its own copy, or the generic fallback. */
export const describeActivity = (event: AuditEvent, t: TFunction): Activity => {
	const activity = ACTIVITIES[event.action];
	const link = activityLink(event);
	if (!activity) {
		return {
			id: event.auditEventId,
			icon: HistoryIcon,
			title: fallbackTitle(event, t),
			...(link && { link }),
		};
	}
	const title =
		event.entityName === null
			? t(`organisation.activity.unnamed.${activity.key}`)
			: t(`organisation.activity.named.${activity.key}`, {
					name: event.entityName,
				});
	return {
		id: event.auditEventId,
		icon: activity.icon,
		title,
		...(link && { link }),
	};
};

/** An activity's details for `ActivityItem`: who did it, if known, and how long ago. */
export const activityDetails = (
	event: AuditEvent,
	t: TFunction,
	now: Date,
	locale: string
): Array<string> => [
	event.actorDisplayName
		? t("organisation.activity.by", { name: event.actorDisplayName })
		: "",
	timeAgo(event.occurredAt, now, locale) ?? t("organisation.activity.justNow"),
];
