import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { ManagedLeaveType } from "@/features/leaveTypes/api";
import { movedOrder } from "@/features/leaveTypes/leaveTypeCatalogue";

type MoveDirection = "up" | "down";

/** The arrow to keep focus on after a move: the pressed one, or the other one once the type reaches an end. */
const arrowToFocus = (
	types: ReadonlyArray<ManagedLeaveType>,
	leaveTypeId: string,
	direction: MoveDirection
): MoveDirection =>
	movedOrder(types, leaveTypeId, direction)
		? direction
		: direction === "up"
			? "down"
			: "up";

/**
 * Keeps a keyboard user's place while reordering: remember the arrow a move
 * was made with, and once `types` arrive in their new order, focus that arrow
 * on the moved row (or the other one at an end). The arrows are found inside
 * `containerRef` by their `data-move="<leaveTypeId>:<direction>"`.
 */
export const useMovedArrowFocus = (
	types: ReadonlyArray<ManagedLeaveType>
): {
	containerRef: RefObject<HTMLDivElement | null>;
	rememberMove: (leaveTypeId: string, direction: MoveDirection) => void;
} => {
	const containerRef = useRef<HTMLDivElement>(null);
	const movedArrow = useRef<{
		leaveTypeId: string;
		direction: MoveDirection;
	} | null>(null);
	useEffect(() => {
		const moved = movedArrow.current;
		if (!moved) return;
		movedArrow.current = null;
		const direction = arrowToFocus(types, moved.leaveTypeId, moved.direction);
		containerRef.current
			?.querySelector<HTMLButtonElement>(
				`[data-move="${moved.leaveTypeId}:${direction}"]`
			)
			?.focus();
	}, [types]);
	const rememberMove = useCallback(
		(leaveTypeId: string, direction: MoveDirection): void => {
			movedArrow.current = { leaveTypeId, direction };
		},
		[]
	);
	return { containerRef, rememberMove };
};
