import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import {
	createConstraint,
	deleteConstraint,
	updateConstraint,
	type ConstraintBody,
	type DepartmentConstraint,
} from "@/features/scheduling/constraints/api";
import {
	SCHEDULING_QUERY_ROOT,
	type DepartmentPath,
} from "@/features/scheduling/paths";

type Saved = { unit: DepartmentPath; body: ConstraintBody };
type Replaced = Saved & { constraintId: string };
type Removed = { unit: DepartmentPath; constraintId: string };

export type ConstraintActions = {
	createConstraint: UseMutationResult<DepartmentConstraint, Error, Saved>;
	updateConstraint: UseMutationResult<DepartmentConstraint, Error, Replaced>;
	deleteConstraint: UseMutationResult<void, Error, Removed>;
};

/**
 * Adding, replacing and deleting a Department's live constraints. A live
 * constraint appears in every draft of its Department, so each success reloads
 * every scheduling query of the company.
 */
export const useConstraintActions = (companyId: string): ConstraintActions => {
	const client = useQueryClient();
	const reload = (): Promise<void> =>
		client.invalidateQueries({
			queryKey: [SCHEDULING_QUERY_ROOT, companyId],
		});
	return {
		createConstraint: useMutation({
			meta: { successMessage: false },
			mutationFn: ({ unit, body }: Saved) =>
				createConstraint(companyId, unit, body),
			onSuccess: reload,
		}),
		updateConstraint: useMutation({
			meta: { successMessage: false },
			mutationFn: ({ unit, constraintId, body }: Replaced) =>
				updateConstraint(companyId, unit, constraintId, body),
			onSuccess: reload,
		}),
		deleteConstraint: useMutation({
			meta: { successMessage: false },
			mutationFn: ({ unit, constraintId }: Removed) =>
				deleteConstraint(companyId, unit, constraintId),
			onSuccess: reload,
		}),
	};
};
