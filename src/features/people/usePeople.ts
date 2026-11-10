import { useQuery } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import type { ListPage } from "@/common/schemas";
import {
	peopleQuery,
	type MemberProfile,
	type PeopleQuery,
} from "@/features/people/api";
import { PEOPLE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { useAccess } from "@/features/workspace/useAccess";

/**
 * One page of the People list. `hidden` when the person's grants don't reach
 * it anywhere, whether the workspace says so up front or the API refuses
 * with a 403. The API returns only the people in units where the key is
 * held, so the rows are never trimmed here.
 */
export type PeopleList =
	| { status: "pending" | "error" | "hidden" }
	| ({ status: "ready" } & ListPage<MemberProfile>);

export const usePeople = (
	companyId: string,
	query: PeopleQuery
): PeopleList => {
	const access = useAccess();
	const allowed = access.canAny(PEOPLE_READ_KEYS, "anywhere");
	const list = useQuery(peopleQuery(companyId, query, allowed));

	if (access.status !== "ready") return { status: access.status };
	if (!allowed) return { status: "hidden" };
	if (list.error instanceof ApiProblemError && list.error.status === 403)
		return { status: "hidden" };
	if (list.isError) return { status: "error" };
	if (list.data === undefined) return { status: "pending" };
	return { status: "ready", ...list.data };
};
