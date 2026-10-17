import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import {
	SCHEDULING_QUERY_ROOT,
	type DepartmentPath,
} from "@/features/scheduling/paths";
import {
	createShift,
	deleteShift,
	updateShift,
	type DepartmentShift,
	type ShiftBody,
} from "@/features/scheduling/shifts/api";

type Saved = { unit: DepartmentPath; body: ShiftBody };
type Replaced = Saved & { shiftId: string };
type Removed = { unit: DepartmentPath; shiftId: string };

export type ShiftActions = {
	createShift: UseMutationResult<DepartmentShift, Error, Saved>;
	updateShift: UseMutationResult<DepartmentShift, Error, Replaced>;
	deleteShift: UseMutationResult<void, Error, Removed>;
};

/**
 * Adding, replacing and deleting a Department's live shifts. A live shift
 * appears in every draft of its Department, so each success reloads every
 * scheduling query of the company.
 */
export const useShiftActions = (companyId: string): ShiftActions => {
	const client = useQueryClient();
	const reload = (): Promise<void> =>
		client.invalidateQueries({
			queryKey: [SCHEDULING_QUERY_ROOT, companyId],
		});
	return {
		createShift: useMutation({
			meta: { successMessage: false },
			mutationFn: ({ unit, body }: Saved) => createShift(companyId, unit, body),
			onSuccess: reload,
		}),
		updateShift: useMutation({
			meta: { successMessage: false },
			mutationFn: ({ unit, shiftId, body }: Replaced) =>
				updateShift(companyId, unit, shiftId, body),
			onSuccess: reload,
		}),
		deleteShift: useMutation({
			meta: { successMessage: false },
			mutationFn: ({ unit, shiftId }: Removed) =>
				deleteShift(companyId, unit, shiftId),
			onSuccess: reload,
		}),
	};
};
