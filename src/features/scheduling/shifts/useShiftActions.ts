import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import type { DepartmentPath } from "@/features/scheduling/paths";
import {
	createShift,
	deleteShift,
	setShiftInclusion,
	shiftsKey,
	updateShift,
	type Shift,
	type ShiftBody,
} from "@/features/scheduling/shifts/api";

/** Which schedule a shift write is for, and the department it belongs to. */
type Target = { unit: DepartmentPath; scheduleId: string };
type Saved = Target & { body: ShiftBody };
type Replaced = Saved & { shiftId: string };
type Removed = Target & { shiftId: string };
type Included = Target & { includedShiftIds: Array<string> };

export type ShiftActions = {
	createShift: UseMutationResult<Shift, Error, Saved>;
	updateShift: UseMutationResult<Shift, Error, Replaced>;
	deleteShift: UseMutationResult<void, Error, Removed>;
	includeShifts: UseMutationResult<Array<Shift>, Error, Included>;
};

/**
 * Adding, replacing and deleting a draft schedule's shifts, and setting
 * which of them it includes; each success reloads that schedule's shifts.
 * Setting the inclusion answers with every shift, which is cached at once.
 */
export const useShiftActions = (companyId: string): ShiftActions => {
	const client = useQueryClient();
	const reload = (_: unknown, { scheduleId }: Target): Promise<void> =>
		client.invalidateQueries({ queryKey: shiftsKey(companyId, scheduleId) });
	return {
		createShift: useMutation({
			mutationFn: ({ unit, scheduleId, body }: Saved) =>
				createShift(companyId, unit, scheduleId, body),
			onSuccess: reload,
		}),
		updateShift: useMutation({
			mutationFn: ({ unit, scheduleId, shiftId, body }: Replaced) =>
				updateShift(companyId, unit, scheduleId, shiftId, body),
			onSuccess: reload,
		}),
		deleteShift: useMutation({
			mutationFn: ({ unit, scheduleId, shiftId }: Removed) =>
				deleteShift(companyId, unit, scheduleId, shiftId),
			onSuccess: reload,
		}),
		includeShifts: useMutation({
			mutationFn: ({ unit, scheduleId, includedShiftIds }: Included) =>
				setShiftInclusion(companyId, unit, scheduleId, includedShiftIds),
			onSuccess: async (shifts, target) => {
				client.setQueryData(shiftsKey(companyId, target.scheduleId), shifts);
				await reload(shifts, target);
			},
		}),
	};
};
