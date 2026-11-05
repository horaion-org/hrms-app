import {
	skipToken,
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import {
	useOrganisationList,
	type OrganisationList,
} from "@/features/organisation/useOrganisationList";
import {
	createSkill,
	deleteSkill,
	fetchSkillCategories,
	fetchSkillOverview,
	updateSkill,
	type Skill,
	type SkillBody,
	type SkillOverview,
	type SkillOverviewQuery,
	type UpdateSkillBody,
} from "@/features/skills/api";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/** The catalogue with its holder counts; `hidden` without `skill:read` at the company. */
export const useSkillOverview = (
	companyId: string,
	query: SkillOverviewQuery
): OrganisationList<SkillOverview> =>
	useOrganisationList(
		companyId,
		"skill:read",
		["skill-overview", query],
		(signal) => fetchSkillOverview(companyId, query, signal)
	);

/** The categories the company's skills use, for the Category filter. */
export const useSkillCategories = (
	companyId: string
): UseQueryResult<Array<string>> => {
	const allowed = useAccess().can("skill:read", COMPANY_SCOPE);
	return useQuery({
		queryKey: ["organisation", companyId, "skill-categories"],
		queryFn: allowed
			? ({ signal }): Promise<Array<string>> =>
					fetchSkillCategories(companyId, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		retry,
	});
};

/**
 * A change to the catalogue. It refreshes the company's lists and the
 * people's skills too, because a skill is shown on every profile holding it.
 */
const useCatalogueChange = <TVariables, TResult>(
	companyId: string,
	change: (variables: TVariables) => Promise<TResult>,
	successMessage:
		| "organisation.skills.toast.created"
		| "organisation.skills.toast.updated"
		| "organisation.skills.toast.deleted"
): UseMutationResult<TResult, Error, TVariables> => {
	const client = useQueryClient();
	return useMutation({
		mutationFn: change,
		meta: { successMessage },
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({ queryKey: ["organisation", companyId] }),
				client.invalidateQueries({ queryKey: ["people", companyId] }),
			]),
	});
};

/** Adds an active skill to the catalogue. */
export const useCreateSkill = (
	companyId: string
): UseMutationResult<Skill, Error, SkillBody> =>
	useCatalogueChange(
		companyId,
		(body: SkillBody) => createSkill(companyId, body),
		"organisation.skills.toast.created"
	);

/** Replaces a skill's fields and status. */
export const useUpdateSkill = (
	companyId: string
): UseMutationResult<
	Skill,
	Error,
	{ skillId: string; body: UpdateSkillBody }
> =>
	useCatalogueChange(
		companyId,
		({ skillId, body }: { skillId: string; body: UpdateSkillBody }) =>
			updateSkill(companyId, skillId, body),
		"organisation.skills.toast.updated"
	);

/** Deletes a skill, which also takes it from everyone holding it. */
export const useDeleteSkill = (
	companyId: string
): UseMutationResult<void, Error, string> =>
	useCatalogueChange(
		companyId,
		(skillId: string) => deleteSkill(companyId, skillId),
		"organisation.skills.toast.deleted"
	);
