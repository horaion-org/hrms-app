import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { ListPage } from "@/common/schemas";
import { useDebouncedValue } from "@/common/useDebouncedValue";
import { type MemberProfile, peopleQuery } from "@/features/people/api";

/**
 * The first page of active people whose name or employee ID matches
 * `query`, by name, from the People list: each with their Branch and
 * Department, so a role's recipient can be told apart from someone with the
 * same name. The API returns only people where the reader holds
 * `member_profile:read`, which the System Owner and System Admin, the only
 * ones who give roles (API ADR-0108), hold company-wide.
 */
export const useActivePeopleSearch = (
	companyId: string,
	query: string
): UseQueryResult<ListPage<MemberProfile>> => {
	const debounced = useDebouncedValue(query.trim());
	return useQuery(
		peopleQuery(companyId, {
			page: 1,
			sort: { field: "displayName", desc: false },
			status: "ACTIVE",
			search: debounced,
		})
	);
};
