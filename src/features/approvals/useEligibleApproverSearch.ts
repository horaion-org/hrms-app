import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { ListPage } from "@/common/schemas";
import { useDebouncedValue } from "@/common/useDebouncedValue";
import {
	type ApprovalSubject,
	approvalKeys,
	searchEligibleApprovers,
} from "@/features/approvals/api";
import type { CompanyMember } from "@/features/organisation/api";
import {
	accessiblePreviousData,
	administrativeMeta,
} from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/** Where the subject and the department sit in `approvalKeys.eligibleApprovers`. */
const SUBJECT_KEY_INDEX = 3;
const DEPARTMENT_KEY_INDEX = 4;

/**
 * Searches the people who can approve a flow's steps for the subject in the
 * department ("" for the company default), delaying requests while typing.
 * The page shown keeps the previous answer only while the subject and
 * department are the same, so another department's people never appear.
 * No `staleTime`: the app's QueryClient keeps TanStack's default of 0, so
 * opening the dialog again or returning to the window asks again, after
 * the admin has granted permissions in Access roles.
 */
export const useEligibleApproverSearch = (
	companyId: string,
	subjectType: ApprovalSubject,
	departmentId: string,
	query: string,
	enabled = true
): UseQueryResult<ListPage<CompanyMember>> => {
	const debounced = useDebouncedValue(query.trim());
	return useQuery({
		enabled,
		queryKey: approvalKeys.eligibleApprovers(
			companyId,
			subjectType,
			departmentId,
			debounced
		),
		queryFn: ({ signal }) =>
			searchEligibleApprovers(
				companyId,
				{ subjectType, departmentId, search: debounced },
				signal
			),
		meta: administrativeMeta(companyId),
		placeholderData: (previous, previousQuery) =>
			previousQuery?.queryKey[1] === companyId &&
			previousQuery.queryKey[SUBJECT_KEY_INDEX] === subjectType &&
			previousQuery.queryKey[DEPARTMENT_KEY_INDEX] === departmentId
				? accessiblePreviousData()(previous, previousQuery)
				: undefined,
		retry,
	});
};
