import {
	keepPreviousData,
	useQuery,
	type UseQueryResult,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
	searchCompanyMembers,
	type CompanyMember,
	type ListPage,
} from "@/features/organisation/api";
import { retry } from "@/features/organisation/useOrganisationOverview";

/** Delays search requests while typing and preserves the current page during a new request. */
export const useCompanyMemberSearch = (
	companyId: string,
	query: string
): UseQueryResult<ListPage<CompanyMember>> => {
	const [debounced, setDebounced] = useState(query.trim());
	useEffect(() => {
		const timeout = setTimeout(() => {
			setDebounced(query.trim());
		}, 250);
		return (): void => {
			clearTimeout(timeout);
		};
	}, [query]);
	return useQuery({
		queryKey: ["organisation", companyId, "members", "ACTIVE", debounced],
		queryFn: () =>
			searchCompanyMembers(companyId, {
				search: debounced,
				status: "ACTIVE",
				size: 20,
			}),
		placeholderData: (previous, previousQuery) =>
			previousQuery?.queryKey[1] === companyId
				? keepPreviousData(previous)
				: undefined,
		retry,
	});
};
