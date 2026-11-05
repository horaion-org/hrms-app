import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import {
	createLeaveType,
	leaveTypeCatalogueQuery,
	leaveTypesKey,
	reorderLeaveTypes,
	updateLeaveType,
	type LeaveTypeBody,
	type LeaveTypeOrderBody,
	type ManagedLeaveType,
	type UpdateLeaveTypeBody,
} from "@/features/leaveTypes/api";

type Replaced = { leaveTypeId: string; body: UpdateLeaveTypeBody };

export type LeaveTypeActions = {
	createLeaveType: UseMutationResult<ManagedLeaveType, Error, LeaveTypeBody>;
	updateLeaveType: UseMutationResult<ManagedLeaveType, Error, Replaced>;
	reorderLeaveTypes: UseMutationResult<
		Array<ManagedLeaveType>,
		Error,
		LeaveTypeOrderBody
	>;
};

/**
 * Adding, replacing and reordering the company's leave types. The apply
 * form's catalogue and every leave list name requests by their type, so each
 * write reloads the company's leave type and leave queries once it settles.
 * A refusal reloads them too: it usually means the list on screen is out of
 * date (another admin changed it), and retrying from the old list would be
 * refused again.
 */
export const useLeaveTypeActions = (companyId: string): LeaveTypeActions => {
	const client = useQueryClient();
	const reload = (): Promise<unknown> =>
		Promise.all([
			client.invalidateQueries({ queryKey: leaveTypesKey(companyId) }),
			client.invalidateQueries({ queryKey: ["leave", companyId] }),
		]);
	return {
		createLeaveType: useMutation({
			meta: { successMessage: false },
			mutationFn: (body: LeaveTypeBody) => createLeaveType(companyId, body),
			onSettled: reload,
		}),
		updateLeaveType: useMutation({
			meta: { successMessage: false },
			mutationFn: ({ leaveTypeId, body }: Replaced) =>
				updateLeaveType(companyId, leaveTypeId, body),
			onSettled: reload,
		}),
		reorderLeaveTypes: useMutation({
			meta: { successMessage: false },
			mutationFn: (body: LeaveTypeOrderBody) =>
				reorderLeaveTypes(companyId, body),
			// The answer is the whole catalogue in its new order: show it at once.
			onSuccess: (catalogue) => {
				client.setQueryData(
					leaveTypeCatalogueQuery(companyId).queryKey,
					catalogue
				);
			},
			onSettled: reload,
		}),
	};
};
