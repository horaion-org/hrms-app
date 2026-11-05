import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import type { DepartmentConstraint } from "@/features/scheduling/constraints/api";
import { SCHEDULING_QUERY_ROOT } from "@/features/scheduling/paths";
import {
	createPolicyConstraint,
	deletePolicyConstraint,
	updatePolicyConstraint,
	type PolicyConstraintBody,
} from "@/features/scheduling/policy/api";

type Replaced = { constraintId: string; body: PolicyConstraintBody };

export type PolicyActions = {
	createConstraint: UseMutationResult<
		DepartmentConstraint,
		Error,
		PolicyConstraintBody
	>;
	updateConstraint: UseMutationResult<DepartmentConstraint, Error, Replaced>;
	deleteConstraint: UseMutationResult<void, Error, string>;
};

/**
 * Adding, replacing and removing the company's constraints. Every
 * Department's list and drafts show them, so each success reloads every
 * scheduling query of the company.
 */
export const usePolicyActions = (companyId: string): PolicyActions => {
	const client = useQueryClient();
	const reload = (): Promise<void> =>
		client.invalidateQueries({
			queryKey: [SCHEDULING_QUERY_ROOT, companyId],
		});
	return {
		createConstraint: useMutation({
			meta: { successMessage: false },
			mutationFn: (body: PolicyConstraintBody) =>
				createPolicyConstraint(companyId, body),
			onSuccess: reload,
		}),
		updateConstraint: useMutation({
			meta: { successMessage: false },
			mutationFn: ({ constraintId, body }: Replaced) =>
				updatePolicyConstraint(companyId, constraintId, body),
			onSuccess: reload,
		}),
		deleteConstraint: useMutation({
			meta: { successMessage: false },
			mutationFn: (constraintId: string) =>
				deletePolicyConstraint(companyId, constraintId),
			onSuccess: reload,
		}),
	};
};
