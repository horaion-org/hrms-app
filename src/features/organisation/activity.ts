import type { TFunction } from "i18next";
import { timeAgo } from "@/common/relativeTime";
import type { Heroicon } from "@/common/types";
import {
	AddStaffIcon,
	DepartmentIcon,
	EmailIcon,
	GenerateScheduleIcon,
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

export type Activity = { id: string; icon: Heroicon; title: string };

/** How an audit event reads in Recent Activity; undefined for actions it doesn't describe. */
export const describeActivity = (
	event: AuditEvent,
	t: TFunction
): Activity | undefined => {
	const activity = ACTIVITIES[event.action];
	if (!activity) return undefined;
	const title =
		event.entityName === null
			? t(`organisation.activity.unnamed.${activity.key}`)
			: t(`organisation.activity.named.${activity.key}`, {
					name: event.entityName,
				});
	return { id: event.auditEventId, icon: activity.icon, title };
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
