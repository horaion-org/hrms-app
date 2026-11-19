import {
	queryOptions,
	skipToken,
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import type { QueryOptionsFor } from "@/common/query-client";
import {
	addDefaultAccessRule,
	fetchDefaultAccessRecipient,
	fetchDefaultAccessRules,
	giveDefaultAccess,
	removeDefaultAccessRule,
	stopDefaultAccess,
	type DefaultAccessRecipient,
	type DefaultAccessRule,
	type DefaultAccessRuleBody,
	type GiveDefaultAccessResult,
} from "@/features/organisation/api";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/**
 * The company's defaults (API ADR-0118). Asked only when `allowed`: the
 * API answers to `access_role:read` held at the whole company.
 */
export const defaultAccessRulesQuery = (
	companyId: string,
	allowed: boolean
): QueryOptionsFor<
	Array<DefaultAccessRule>,
	readonly ["organisation", string, "default-access-rules"]
> =>
	queryOptions({
		queryKey: ["organisation", companyId, "default-access-rules"] as const,
		queryFn: allowed
			? ({ signal }): Promise<Array<DefaultAccessRule>> =>
					fetchDefaultAccessRules(companyId, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		retry,
	});

/**
 * Whether one person receives default access. Asked only when `allowed`,
 * as `defaultAccessRulesQuery`.
 */
export const defaultAccessRecipientQuery = (
	companyId: string,
	membershipId: string,
	allowed: boolean
): QueryOptionsFor<
	DefaultAccessRecipient,
	readonly ["organisation", string, "default-access-recipient", string]
> =>
	queryOptions({
		queryKey: [
			"organisation",
			companyId,
			"default-access-recipient",
			membershipId,
		] as const,
		queryFn:
			allowed && membershipId
				? ({ signal }): Promise<DefaultAccessRecipient> =>
						fetchDefaultAccessRecipient(companyId, membershipId, signal)
				: skipToken,
		meta: administrativeMeta(companyId),
		retry,
	});

/**
 * Reloads everything under the company's Organisation entries, defaults and
 * people's access included, in the background: a change is done when the
 * API answers, so a re-read that is slow or retrying never holds its dialog.
 */
const useReloadOrganisation = (companyId: string): (() => void) => {
	const client = useQueryClient();
	return () => {
		void client.invalidateQueries({ queryKey: ["organisation", companyId] });
	};
};

/** Adds a default at the place the body names. */
export const useAddDefaultAccessRule = (
	companyId: string
): UseMutationResult<DefaultAccessRule, Error, DefaultAccessRuleBody> => {
	const reload = useReloadOrganisation(companyId);
	return useMutation({
		mutationFn: (body) => addDefaultAccessRule(companyId, body),
		meta: { successMessage: "organisation.accessRoles.defaults.toast.added" },
		onSettled: reload,
	});
};

/** Removes one default. */
export const useRemoveDefaultAccessRule = (
	companyId: string
): UseMutationResult<void, Error, string> => {
	const reload = useReloadOrganisation(companyId);
	return useMutation({
		mutationFn: (defaultAccessRuleId) =>
			removeDefaultAccessRule(companyId, defaultAccessRuleId),
		meta: { successMessage: "organisation.accessRoles.defaults.toast.removed" },
		onSettled: reload,
	});
};

/**
 * Gives default access to people already in the company, all or nothing.
 * Confirms with a plain toast unless `confirmed` says the caller presents
 * the counts itself, as the give dialog does.
 */
export const useGiveDefaultAccess = (
	companyId: string,
	{ confirmed = false }: { confirmed?: boolean } = {}
): UseMutationResult<GiveDefaultAccessResult, Error, ReadonlyArray<string>> => {
	const reload = useReloadOrganisation(companyId);
	return useMutation({
		mutationFn: (membershipIds) => giveDefaultAccess(companyId, membershipIds),
		meta: {
			successMessage: confirmed
				? false
				: "organisation.accessRoles.defaults.toast.given",
		},
		onSettled: reload,
	});
};

/** Stops default access for one person. */
export const useStopDefaultAccess = (
	companyId: string
): UseMutationResult<void, Error, string> => {
	const reload = useReloadOrganisation(companyId);
	return useMutation({
		mutationFn: (membershipId) => stopDefaultAccess(companyId, membershipId),
		meta: { successMessage: "organisation.accessRoles.defaults.toast.stopped" },
		onSettled: reload,
	});
};
