import {
	PERMISSION_KEYS,
	type PermissionKey,
	type PermissionResource,
	resourceOf,
} from "@/features/workspace/permissionKeys";

/**
 * The app's menu areas a role is edited in, in the menu's order, with the
 * resources whose keys open each one. Settings' areas follow its sections.
 * Every catalogue resource sits in exactly one area (a test keeps it so):
 * - Dashboard holds the two sections of Home with keys of their own,
 *   waiting approvals and people events.
 * - Organisation holds its tabs, skills and the activity record, all of
 *   which its overview opens.
 */
export const PERMISSION_AREAS = [
	{ area: "dashboard", resources: ["approval", "member_event"] },
	{ area: "scheduling", resources: ["schedule", "shift", "constraint"] },
	{ area: "leave", resources: ["leave_request"] },
	{ area: "shiftPreferences", resources: ["shift_preference"] },
	{ area: "availability", resources: ["work_availability"] },
	{
		area: "people",
		resources: ["member_profile", "member_note", "member_employment_terms"],
	},
	{
		area: "organisation",
		resources: [
			"branch",
			"branch_member",
			"department",
			"department_member",
			"job_title",
			"skill",
			"audit_event",
		],
	},
	{ area: "reports", resources: ["report"] },
	{ area: "settingsCompany", resources: ["company"] },
	{ area: "settingsEmployment", resources: ["employment_terms"] },
	{ area: "settingsWorkPolicy", resources: ["scheduling_policy"] },
	{ area: "settingsLeave", resources: ["leave_type", "leave_duration"] },
	{ area: "settingsApprovals", resources: ["approval_flow"] },
	{ area: "settingsAccess", resources: ["access_role"] },
] as const satisfies ReadonlyArray<{
	area: string;
	resources: ReadonlyArray<PermissionResource>;
}>;

/** One menu area of the role editor, e.g. `scheduling`. */
export type PermissionArea = (typeof PERMISSION_AREAS)[number]["area"];

/** Every area, in the menu's order. */
export const AREAS: ReadonlyArray<PermissionArea> = PERMISSION_AREAS.map(
	({ area }) => area
);

/** Whether an area sits under Settings, which the editor lists under its own heading. */
export const isSettingsArea = (area: PermissionArea): boolean =>
	area.startsWith("settings");

const AREA_OF_RESOURCE = new Map<PermissionResource, PermissionArea>(
	PERMISSION_AREAS.flatMap(({ area, resources }) =>
		resources.map((resource) => [resource, area] as const)
	)
);

/** The area a key is edited in. */
export const areaOf = (key: PermissionKey): PermissionArea =>
	AREA_OF_RESOURCE.get(resourceOf(key)) as PermissionArea;

/** Every key of an area, in the catalogue's order. */
export const keysOfArea = (area: PermissionArea): Array<PermissionKey> =>
	PERMISSION_KEYS.filter((key) => areaOf(key) === area);
