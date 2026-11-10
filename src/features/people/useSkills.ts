import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import type { ListPage } from "@/common/schemas";
import {
	memberSkillsQuery,
	replaceMemberSkills,
	type MemberSkill,
	type SkillValue,
	peopleKeys,
} from "@/features/people/api";
import {
	searchActiveSkills,
	skillKeys,
	type Skill,
} from "@/features/skills/api";
import {
	accessiblePreviousData,
	administrativeMeta,
} from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

/** A person's skills. */
export const useMemberSkills = (
	companyId: string,
	membershipId: string
): UseQueryResult<Array<MemberSkill>> =>
	useQuery(memberSkillsQuery(companyId, membershipId));

/** What one change to a person's skills confirms when it is saved. */
export type SkillsChange = "added" | "updated" | "removed";

/**
 * Replaces a person's skills with the complete new set, keeps what the API
 * saved, refreshes the catalogue's holder counts, and confirms the change
 * with its own toast.
 */
export const useReplaceSkills = (
	companyId: string,
	membershipId: string,
	change: SkillsChange
): UseMutationResult<Array<MemberSkill>, Error, ReadonlyArray<SkillValue>> => {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (skills) =>
			replaceMemberSkills(companyId, membershipId, skills),
		meta: { successMessage: `people.skills.toast.${change}` },
		onSuccess: (saved) => {
			client.setQueryData(
				memberSkillsQuery(companyId, membershipId).queryKey,
				saved
			);
			return client.invalidateQueries({
				queryKey: skillKeys.overview(companyId),
			});
		},
	});
};

/**
 * The catalogue's active skills matching what is typed, asked for once
 * typing pauses, keeping the current ones on screen while the next load.
 */
export const useSkillSuggestions = (
	companyId: string,
	query: string
): UseQueryResult<ListPage<Skill>> => {
	const search = useDebouncedValue(query.trim(), 250);
	return useQuery({
		queryKey: peopleKeys.skillSuggestions(companyId, search),
		queryFn: ({ signal }) => searchActiveSkills(companyId, search, signal),
		placeholderData: accessiblePreviousData(),
		meta: administrativeMeta(companyId),
		retry,
	});
};
