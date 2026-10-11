import type { TFunction } from "i18next";
import type { Heroicon } from "@/common/types";
import {
	AddStaffIcon,
	DepartmentIcon,
	LeaveIcon,
	OrganisationIcon,
	PermissionsIcon,
	RemoveUserIcon,
	RoleIcon,
	UserIcon,
} from "@/components/ui/Icon";
import type { AuditEvent } from "@/features/organisation/api";

type ActivityKey =
	| "branchCreated"
	| "branchUpdated"
	| "departmentCreated"
	| "departmentUpdated"
	| "jobTitleCreated"
	| "jobTitleUpdated"
	| "roleCreated"
	| "roleUpdated"
	| "roleDeleted"
	| "memberAdded"
	| "memberDeactivated"
	| "memberReactivated"
	| "leaveRequested"
	| "leaveApproved"
	| "leaveRejected";

const ACTIVITIES: Record<string, { key: ActivityKey; icon: Heroicon }> = {
	"branch.create": { key: "branchCreated", icon: OrganisationIcon },
	"branch.update": { key: "branchUpdated", icon: OrganisationIcon },
	"department.create": { key: "departmentCreated", icon: DepartmentIcon },
	"department.update": { key: "departmentUpdated", icon: DepartmentIcon },
	"job_title.create": { key: "jobTitleCreated", icon: RoleIcon },
	"job_title.update": { key: "jobTitleUpdated", icon: RoleIcon },
	"access_role.create": { key: "roleCreated", icon: UserIcon },
	"access_role.update": { key: "roleUpdated", icon: PermissionsIcon },
	"access_role.delete": { key: "roleDeleted", icon: UserIcon },
	"member_profile.create": { key: "memberAdded", icon: AddStaffIcon },
	"member_profile.deactivate": {
		key: "memberDeactivated",
		icon: RemoveUserIcon,
	},
	"member_profile.reactivate": { key: "memberReactivated", icon: UserIcon },
	"leave_request.create": { key: "leaveRequested", icon: LeaveIcon },
	"leave_request.approve": { key: "leaveApproved", icon: LeaveIcon },
	"leave_request.reject": { key: "leaveRejected", icon: LeaveIcon },
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

const UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
	{ unit: "year", seconds: 365 * 24 * 60 * 60 },
	{ unit: "month", seconds: 30 * 24 * 60 * 60 },
	{ unit: "week", seconds: 7 * 24 * 60 * 60 },
	{ unit: "day", seconds: 24 * 60 * 60 },
	{ unit: "hour", seconds: 60 * 60 },
	{ unit: "minute", seconds: 60 },
];

/**
 * "2 hours ago", "Yesterday", "5 days ago": the largest whole unit since
 * `occurredAt`, or undefined when it is under a minute ago (or in the future).
 */
export const timeAgo = (
	occurredAt: string,
	now: Date,
	locale: string
): string | undefined => {
	const elapsed = (now.getTime() - new Date(occurredAt).getTime()) / 1000;
	const match = UNITS.find(({ seconds }) => elapsed >= seconds);
	if (!match || Number.isNaN(elapsed)) return undefined;
	const text = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
		-Math.floor(elapsed / match.seconds),
		match.unit
	);
	return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
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
