import { ApiProblemError } from "@/common/problem";
import type { MemberProfile } from "@/features/people/api";
import type { PermissionKey } from "@/features/workspace/permissionKeys";

/**
 * Where a key about one person is asked, as the API checks it: at their
 * Department, where a grant at its Branch or the company also counts, or
 * for someone without a Department, at the company.
 */
export const personScope = ({
	departmentId,
}: Pick<MemberProfile, "departmentId">): string | undefined =>
	departmentId ?? undefined;

/**
 * Whether the person may change this profile, as the workspace says: with
 * `member_profile:update` where the profile is, see `personScope`.
 */
export const profileEditAccess = (
	profile: Pick<MemberProfile, "departmentId">,
	can: (permission: PermissionKey, scopeId?: string) => boolean
): boolean => can("member_profile:update", personScope(profile));

/**
 * Whether the API refused a read about one person: a 403 when they are
 * outside the units where the key is held, which the workspace had not yet
 * shown. It is treated like not holding the key.
 */
export const isRefused = (error: unknown): boolean =>
	error instanceof ApiProblemError && error.status === 403;
