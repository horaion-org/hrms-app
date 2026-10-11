import { ApiProblemError } from "@/common/problem";
import type { MemberProfile } from "@/features/people/api";
import {
	recordScope,
	type CanAt,
	type ScopeRef,
} from "@/features/workspace/scopes";

/**
 * Where a key about one person is asked, as the API checks it: at their
 * Department (whose workspace node already carries grants made at its
 * Branch or the company), or, for someone without a Department, at the
 * company. Never at the actor's own Department.
 */
export const personScope = ({
	departmentId,
}: Pick<MemberProfile, "departmentId">): ScopeRef => recordScope(departmentId);

/**
 * Whether the person may change this profile, as the workspace says: with
 * `member_profile:update` where the profile is, see `personScope`. Reading
 * the same profile may be allowed more widely; it is never a proxy for this.
 */
export const profileEditAccess = (
	profile: Pick<MemberProfile, "departmentId">,
	can: CanAt
): boolean => can("member_profile:update", personScope(profile));

/**
 * Whether the API refused a read about one person: a 403 when they are
 * outside the units where the key is held, which the workspace had not yet
 * shown. It is treated like not holding the key.
 */
export const isRefused = (error: unknown): boolean =>
	error instanceof ApiProblemError && error.status === 403;
