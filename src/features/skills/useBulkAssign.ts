import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import type { ListPage } from "@/common/schemas";
import { useDebouncedValue } from "@/common/useDebouncedValue";
import {
	assignSkill,
	BULK_ASSIGN_MAX_PEOPLE,
	fetchAssignablePeople,
	fetchSkillHolders,
	type AssignablePerson,
	type BulkAssignBody,
	type BulkAssignResult,
	type SkillHolder,
} from "@/features/skills/api";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/** The API's largest page, so at most five pages reach the bulk limit. */
const PAGE_SIZE = 100;

/**
 * Reads pages of `fetchPage` until every row is in or the bulk limit is
 * reached, and keeps the whole list's total.
 */
export const collectPages = async <T>(
	fetchPage: (page: number) => Promise<ListPage<T>>,
	limit = BULK_ASSIGN_MAX_PEOPLE
): Promise<ListPage<T>> => {
	const items: Array<T> = [];
	let total = 0;
	for (let page = 0; page * PAGE_SIZE < limit; page += 1) {
		// The next page is asked for only when this one says more rows exist.
		// eslint-disable-next-line no-await-in-loop
		const next = await fetchPage(page);
		items.push(...next.items);
		total = next.total;
		if (items.length >= total || next.items.length < PAGE_SIZE) break;
	}
	return { items: items.slice(0, limit), total };
};

/**
 * The active people a skill may be given to, matching what is typed and in
 * one Department when chosen: the first 500 by name, with the total.
 */
export const useAssignablePeople = (
	companyId: string,
	search: string,
	departmentId: string | undefined
): UseQueryResult<ListPage<AssignablePerson>> => {
	const typed = useDebouncedValue(search.trim());
	return useQuery({
		queryKey: [
			"organisation",
			companyId,
			"assignable-people",
			typed,
			departmentId,
		],
		queryFn: ({ signal }) =>
			collectPages((page) =>
				fetchAssignablePeople(
					companyId,
					{ search: typed, departmentId, page },
					signal
				)
			),
		placeholderData: keepPreviousData,
		meta: administrativeMeta(companyId),
		retry,
	});
};

/** Who already holds the skill, among the first 500 the caller may see, by membership id. */
export const useSkillHolders = (
	companyId: string,
	skillId: string,
	departmentId: string | undefined
): UseQueryResult<Map<string, SkillHolder>> =>
	useQuery({
		queryKey: [
			"organisation",
			companyId,
			"skill-holders",
			skillId,
			departmentId,
		],
		queryFn: async ({ signal }) => {
			const holders = await collectPages((page) =>
				fetchSkillHolders(companyId, skillId, { departmentId, page }, signal)
			);
			return new Map(
				holders.items.map((holder) => [holder.membershipId, holder])
			);
		},
		meta: administrativeMeta(companyId),
		retry,
	});

/**
 * Gives one skill to many people, then refreshes the catalogue's counts and
 * people's skills. The page confirms it with the result's own summary.
 */
export const useAssignSkill = (
	companyId: string,
	skillId: string
): UseMutationResult<BulkAssignResult, Error, BulkAssignBody> => {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (body) => assignSkill(companyId, skillId, body),
		meta: { successMessage: false },
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({ queryKey: ["organisation", companyId] }),
				client.invalidateQueries({ queryKey: ["people", companyId] }),
			]),
	});
};
