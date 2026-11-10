import type { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";
import type {
	RosterChange,
	RosterChangeBody,
	RosterChangeCell,
} from "@/features/scheduling/rosterChanges/api";
import { rosterChangeRefusal } from "@/features/scheduling/rosterChanges/rosterChangeRefusal";
import { cellsForChoice } from "@/features/scheduling/rosterChanges/rosterEdit";
import {
	leaveTookTheShift,
	rosterLeaveRefusal,
	type RosterLeaveMove,
	type RosterLeaveRefusal,
} from "@/features/scheduling/rosterChanges/rosterLeave";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import { useRosterLeaveActions } from "@/features/scheduling/rosterChanges/useRosterLeaveActions";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import type { StrandedLeave } from "@/features/scheduling/RosterCellPanel/cellPanelState";

export type LeaveMoveInput = {
	target: RosterChangeTarget;
	revision: number;
	assignment: ScheduleAssignment;
	/** The roster editor's own Apply, used for the roster half of a move. */
	apply: UseMutationResult<RosterChange, Error, RosterChangeBody>;
	onApplied: (change: RosterChange) => void;
	onLeaveChanged?: () => void;
};

/** What the roster half of taking someone off leave sends: the cells, and the fingerprint of checks ticked for them. */
export type RosterHalf = {
	cells: Array<RosterChangeCell>;
	checksFingerprint: string | undefined;
};

export type LeaveMove = {
	/** Runs a move through Leave, then edits the roster where the move needs it. */
	run: (
		move: RosterLeaveMove,
		remark: string,
		rosterHalf: RosterHalf
	) => Promise<void>;
	/** Why the last move failed in Leave, if it did. */
	failure: RosterLeaveRefusal | undefined;
	pending: boolean;
	/** The leave was cancelled but the roster edit after it was refused. */
	stranded: StrandedLeave | undefined;
	/** Forgets a failure, which belongs to the choice that caused it. */
	reset: () => void;
};

/**
 * A day's leave moves. Each calls Leave with the remark; taking someone off
 * leave then edits the roster in a second step, marked as such so the API
 * never undoes half of the move. Refused, the day is left as the cancelled
 * leave left it: `assignment` here is still the day before that refresh,
 * which says whether it is flagged.
 */
export const useLeaveMove = ({
	target,
	revision,
	assignment,
	apply,
	onApplied,
	onLeaveChanged,
}: LeaveMoveInput): LeaveMove => {
	const leaveActions = useRosterLeaveActions(target);
	const [stranded, setStranded] = useState<StrandedLeave>();
	const membershipId = assignment.member?.membershipId ?? null;

	const error =
		leaveActions.putOnLeave.error ??
		leaveActions.changeType.error ??
		leaveActions.cancelDay.error ??
		leaveActions.cancelDayFirst.error;
	const pending =
		leaveActions.putOnLeave.isPending ||
		leaveActions.changeType.isPending ||
		leaveActions.cancelDay.isPending ||
		leaveActions.cancelDayFirst.isPending;

	const editRoster = async (
		remark: string,
		{ cells, checksFingerprint }: RosterHalf
	): Promise<void> => {
		try {
			onApplied(
				await apply.mutateAsync({
					expectedRevision: revision,
					cells,
					remark,
					checksFingerprint,
					leaveMove: true,
				})
			);
		} catch (refused) {
			setStranded({
				refusal: rosterChangeRefusal(refused),
				flagged: leaveTookTheShift(assignment),
			});
		}
	};

	const run = async (
		move: RosterLeaveMove,
		remark: string,
		rosterHalf: RosterHalf
	): Promise<void> => {
		if (membershipId === null) return;
		const leaveOf = { membershipId, day: assignment.day, remark };
		const dayOfRequest = {
			...leaveOf,
			leaveRequestId: assignment.leaveRequestId ?? "",
		};
		try {
			switch (move.kind) {
				case "putOnLeave":
					await leaveActions.putOnLeave.mutateAsync({
						...leaveOf,
						leaveType: move.leaveType,
					});
					onLeaveChanged?.();
					return;
				case "changeType":
					await leaveActions.changeType.mutateAsync({
						...dayOfRequest,
						leaveType: move.leaveType,
					});
					onLeaveChanged?.();
					return;
				case "backToDayOff":
					if (leaveTookTheShift(assignment)) {
						await leaveActions.cancelDayFirst.mutateAsync(dayOfRequest);
						await editRoster(remark, {
							cells: cellsForChoice(assignment, { kind: "dayOff" }),
							checksFingerprint: undefined,
						});
						return;
					}
					await leaveActions.cancelDay.mutateAsync(dayOfRequest);
					onLeaveChanged?.();
					return;
				case "backToShift":
					await leaveActions.cancelDayFirst.mutateAsync(dayOfRequest);
					await editRoster(remark, rosterHalf);
					return;
			}
		} catch {
			// The mutation keeps the error, which the panel shows.
		}
	};

	return {
		run,
		failure: error ? rosterLeaveRefusal(error) : undefined,
		pending,
		stranded,
		reset: (): void => {
			Object.values(leaveActions).forEach((action) => {
				action.reset();
			});
		},
	};
};
