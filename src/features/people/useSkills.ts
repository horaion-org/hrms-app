import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { ListPage } from "@/features/organisation/api";
import {
	memberSkillsQuery,
	replaceMemberSkills,
	searchCompanySkills,
	type CompanySkill,
	type MemberSkill,
	type SkillValue,
} from "@/features/people/api";
import { sameSkills } from "@/features/people/skills";
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

/** Replaces a person's skills with the complete new set, and keeps what the API saved. */
export const useReplaceSkills = (
	companyId: string,
	membershipId: string
): UseMutationResult<Array<MemberSkill>, Error, ReadonlyArray<SkillValue>> => {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (skills) =>
			replaceMemberSkills(companyId, membershipId, skills),
		onSuccess: (saved) => {
			client.setQueryData(
				memberSkillsQuery(companyId, membershipId).queryKey,
				saved
			);
		},
	});
};

/**
 * The company's skill names matching what is typed, asked for once typing
 * pauses, keeping the current names on screen while the next ones load.
 */
export const useSkillSuggestions = (
	companyId: string,
	query: string
): UseQueryResult<ListPage<CompanySkill>> => {
	const search = useDebouncedValue(query.trim(), 250);
	return useQuery({
		queryKey: ["people", companyId, "skills", search] as const,
		queryFn: () => searchCompanySkills(companyId, search),
		placeholderData: accessiblePreviousData(),
		meta: administrativeMeta(companyId),
		retry,
	});
};

/** A person's skills as changed on the page, held until the page saves them. */
export type SkillsDraft = {
	skills: ReadonlyArray<SkillValue>;
	onChange: (skills: Array<SkillValue>) => void;
	/** Whether they differ from the skills as loaded. */
	changed: boolean;
};

/** Holds changes to `loaded`, the skills as the API has them, until saved or discarded. */
export const useSkillsDraft = (
	loaded: ReadonlyArray<MemberSkill> | undefined
): SkillsDraft => {
	const [edited, setEdited] = useState<Array<SkillValue>>();
	const initial = useMemo(
		() =>
			(loaded ?? []).map(({ name, proficiency }) => ({ name, proficiency })),
		[loaded]
	);
	const skills = edited ?? initial;
	return {
		skills,
		onChange: setEdited,
		changed: edited !== undefined && !sameSkills(edited, loaded ?? []),
	};
};
