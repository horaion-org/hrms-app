import type { TFunction } from "i18next";
import type {
	AccessRole,
	MemberAccessRoleAssignment,
} from "@/features/organisation/api";
import { levelOf } from "@/features/organisation/assignmentTargets";
import {
	placeKey,
	placeOf,
	scopeOfPlace,
	type PlaceRef,
} from "@/features/workspace/places";
import {
	sectionLevels,
	sectionLevelText,
} from "@/features/organisation/sectionLevels";
import type { Workspace } from "@/features/workspace/api";
import {
	assignableAt,
	PERMISSION_KEYS,
	type PermissionKey,
} from "@/features/workspace/permissionKeys";

/** What a person's system roles give at one place. */
export type PlaceAccess = {
	branchId: string | null;
	departmentId: string | null;
	/** In catalogue order. */
	permissions: Array<PermissionKey>;
};

/** The whole company first, then Branches, then Departments. */
const levelRank = (place: PlaceRef): number =>
	({ company: 0, branch: 1, department: 2 })[scopeOfPlace(place).kind];

/**
 * Per place, the permissions a person's system roles give there, from the
 * active assignments of active roles only: the whole company first, then
 * Branches, then Departments, each level in the order its places are first
 * held. A key gives nothing at a level it can't be given at (a company-only
 * key held at a Branch, say), so it is left out there, as are keys this app
 * doesn't know and places left with nothing. Each place shows what is given
 * there: a grant above it is not repeated beneath it.
 */
export const accessSummary = (
	assignments: ReadonlyArray<MemberAccessRoleAssignment>,
	roles: ReadonlyArray<AccessRole>
): Array<PlaceAccess> => {
	const byPlace = new Map<string, { place: PlaceRef; keys: Set<string> }>();
	for (const assignment of assignments) {
		const role = roles.find(
			(candidate) => candidate.accessRoleId === assignment.accessRoleId
		);
		if (assignment.status !== "ACTIVE" || role?.status !== "ACTIVE") continue;
		const id = placeKey(assignment);
		const entry = byPlace.get(id) ?? { place: assignment, keys: new Set() };
		for (const permission of role.permissions) entry.keys.add(permission);
		byPlace.set(id, entry);
	}
	return [...byPlace.values()]
		.map(({ place, keys }) => {
			const level = levelOf(scopeOfPlace(place));
			return {
				branchId: place.branchId ?? null,
				departmentId: place.departmentId ?? null,
				permissions: PERMISSION_KEYS.filter(
					(key) => keys.has(key) && assignableAt(key, level)
				),
			};
		})
		.filter((place) => place.permissions.length > 0)
		.sort((first, second) => levelRank(first) - levelRank(second));
};

/**
 * A person's assignments once one role's places are changed: the role is
 * newly given, active, at each chosen place it isn't held at, and taken
 * away from each of `changeable` that is no longer chosen. Everything else
 * stays as it is, including the role's places the person may not change.
 */
export const assignmentsAfter = (
	current: ReadonlyArray<MemberAccessRoleAssignment>,
	accessRoleId: string,
	chosen: ReadonlyArray<PlaceRef>,
	changeable: ReadonlyArray<PlaceRef>
): Array<MemberAccessRoleAssignment> => {
	const chosenKeys = new Set(chosen.map(placeKey));
	const dropped = new Set(
		changeable.map(placeKey).filter((id) => !chosenKeys.has(id))
	);
	const kept = current.filter(
		(assignment) =>
			assignment.accessRoleId !== accessRoleId ||
			!dropped.has(placeKey(assignment))
	);
	const held = new Set(
		kept
			.filter((assignment) => assignment.accessRoleId === accessRoleId)
			.map(placeKey)
	);
	return [
		...kept,
		...chosen
			.filter((place) => !held.has(placeKey(place)))
			.map((place) => ({
				accessRoleAssignmentId: "",
				accessRoleId,
				status: "ACTIVE" as const,
				branchId: place.branchId ?? null,
				departmentId: place.departmentId ?? null,
			})),
	];
};

/**
 * Names a place the way `placeOf` words it, from the units the workspace
 * lists; undefined for a Branch or Department it doesn't list, which the
 * person can't see.
 */
export const placeLabels =
	(
		workspace: Workspace | undefined,
		companyId: string,
		t: TFunction
	): ((place: PlaceRef) => string | undefined) =>
	(place) => {
		const scope = scopeOfPlace(place);
		if (scope.kind === "company") return placeOf({}, t);
		const company = workspace?.companies.find(
			(candidate) => candidate.uuid === companyId
		);
		for (const branch of company?.branches ?? []) {
			if (scope.kind === "branch" && branch.uuid === scope.id)
				return placeOf({ branchName: branch.name }, t);
			const department = branch.departments.find(
				(candidate) => candidate.uuid === scope.id
			);
			if (scope.kind === "department" && department)
				return placeOf(
					{ branchName: branch.name, departmentName: department.name },
					t
				);
		}
		return undefined;
	};

/** One place's access in words: where, and one "Section: Level" line per section, e.g. "Scheduling: Manage". */
export type PlaceAccessText = { place: string; lines: Array<string> };

/**
 * A summary in words, for a `DescriptionList`: per place, how much of each
 * section of the role editor is given there (see `sectionLevels`). Places
 * `placeLabel` can't name are left out.
 */
export const describeAccess = (
	summary: ReadonlyArray<PlaceAccess>,
	placeLabel: (place: PlaceRef) => string | undefined,
	t: TFunction
): Array<PlaceAccessText> =>
	summary.flatMap((entry) => {
		const place = placeLabel(entry);
		if (place === undefined) return [];
		const lines = sectionLevels(entry.permissions).map((section) =>
			sectionLevelText(section, t)
		);
		return [{ place, lines }];
	});
