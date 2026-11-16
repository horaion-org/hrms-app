import type { AccessRoleKind } from "@/features/organisation/api";
import { keysFor } from "@/features/organisation/PermissionChecklist/groups";
import {
	definitionOf,
	type PermissionKey,
} from "@/features/workspace/permissionKeys";

/**
 * The keys that reached the product after the role's permissions were last
 * saved (`reviewedAt`), that a role of `kind` may hold and `held` lacks, in
 * the catalogue's order. A key counts from its day (`since`, UTC), so one
 * that arrived on the day of the save is not new (API ADR-0101). None when
 * the role has no review time: the owner role, or an API that doesn't send
 * one.
 */
export const newSinceReview = (
	held: ReadonlyArray<string>,
	reviewedAt: string | null | undefined,
	kind: AccessRoleKind
): Array<PermissionKey> => {
	if (!reviewedAt) return [];
	const reviewedDay = new Date(reviewedAt).toISOString().slice(0, 10);
	return keysFor(kind).filter(
		(key) => !held.includes(key) && definitionOf(key).since > reviewedDay
	);
};
