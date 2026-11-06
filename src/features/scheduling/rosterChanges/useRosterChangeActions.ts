import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import type { DepartmentPath } from "@/features/scheduling/paths";
import {
	applyRosterChange,
	latestRosterChangeKey,
	undoRosterChange,
	type RosterChange,
	previewRosterUndo,
	type RosterChangeBody,
	type RosterChangePreview,
	type RosterUndoBody,
} from "@/features/scheduling/rosterChanges/api";
import { rosterChangeRefusal } from "@/features/scheduling/rosterChanges/rosterChangeRefusal";
import { patchRoster } from "@/features/scheduling/rosterChanges/rosterEdit";
import {
	scheduleAssignmentsKey,
	scheduleKey,
	type Schedule,
	type ScheduleAssignment,
} from "@/features/scheduling/schedules/api";

/** Undoing names the edit, the revision it produced and what the undo's checks ask for. */
type Undo = { changeId: string; body: RosterUndoBody };

/** Previewing an undo names the edit and the revision it produced. */
type UndoPreview = { changeId: string; expectedRevision: number };

export type RosterChangeActions = {
	apply: UseMutationResult<RosterChange, Error, RosterChangeBody>;
	/** Asked right before an undo: what it would write back and what its checks ask. Writes nothing. */
	previewUndo: UseMutationResult<RosterChangePreview, Error, UndoPreview>;
	undo: UseMutationResult<RosterChange, Error, Undo>;
};

/** Where the roster being changed lives, and which run's rows are shown. */
export type RosterChangeTarget = {
	companyId: string;
	unit: DepartmentPath;
	scheduleId: string;
	runId: string | null;
};

/**
 * Applying and undoing a hand change. A landed change is cached at once: the
 * schedule moves to the new revision and the roster at that revision is the
 * old rows with the changed ones in place, so the grid updates without a
 * reload; then the schedule's reads refresh in the background. A stale
 * revision refreshes them too, so the person sees the roster as it is now.
 */
export const useRosterChangeActions = ({
	companyId,
	unit,
	scheduleId,
	runId,
}: RosterChangeTarget): RosterChangeActions => {
	const client = useQueryClient();
	const refresh = (): Promise<void> =>
		client.invalidateQueries({ queryKey: scheduleKey(companyId, scheduleId) });
	const landed = async (change: RosterChange): Promise<void> => {
		const before = client.getQueryData<Array<ScheduleAssignment>>(
			scheduleAssignmentsKey(companyId, scheduleId, runId, change.fromRevision)
		);
		if (before)
			client.setQueryData(
				scheduleAssignmentsKey(companyId, scheduleId, runId, change.toRevision),
				patchRoster(before, change.assignments)
			);
		client.setQueryData(
			latestRosterChangeKey(companyId, scheduleId, change.toRevision),
			change
		);
		client.setQueryData<Schedule>(
			scheduleKey(companyId, scheduleId),
			(schedule) =>
				schedule && { ...schedule, rosterRevision: change.toRevision }
		);
		await refresh();
	};
	const refreshWhenStale = async (error: Error): Promise<void> => {
		if (rosterChangeRefusal(error) === "revision") await refresh();
	};
	return {
		apply: useMutation({
			meta: { successMessage: false },
			mutationFn: (body: RosterChangeBody) =>
				applyRosterChange(companyId, unit, scheduleId, body),
			onSuccess: landed,
			onError: refreshWhenStale,
		}),
		previewUndo: useMutation({
			meta: { successMessage: false },
			mutationFn: ({ changeId, expectedRevision }: UndoPreview) =>
				previewRosterUndo(
					companyId,
					unit,
					scheduleId,
					changeId,
					expectedRevision
				),
			onError: refreshWhenStale,
		}),
		undo: useMutation({
			meta: { successMessage: "scheduling.rosterEdit.undone" },
			mutationFn: ({ changeId, body }: Undo) =>
				undoRosterChange(companyId, unit, scheduleId, changeId, body),
			onSuccess: landed,
			onError: refreshWhenStale,
		}),
	};
};
