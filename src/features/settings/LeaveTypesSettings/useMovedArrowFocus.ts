import { useCallback, useEffect, useRef, type RefObject } from "react";

type MoveDirection = "up" | "down";

/** Whether an item can still move one place this way in the list as it now is. */
export type CanMove = (id: string, direction: MoveDirection) => boolean;

/**
 * Keeps a keyboard user's place while reordering: remember the arrow a move
 * was made with, and once the list arrives in its new order (a new
 * `canMove`, made from it), focus that arrow on the moved row, or the other
 * one once the row reaches an end. The arrows are found inside
 * `containerRef` by their `data-move="<id>:<direction>"`. Pass `canMove`
 * memoised on the list, so it changes only when the list does.
 */
export const useMovedArrowFocus = (
	canMove: CanMove
): {
	containerRef: RefObject<HTMLDivElement | null>;
	rememberMove: (id: string, direction: MoveDirection) => void;
} => {
	const containerRef = useRef<HTMLDivElement>(null);
	const movedArrow = useRef<{ id: string; direction: MoveDirection } | null>(
		null
	);
	useEffect(() => {
		const moved = movedArrow.current;
		if (!moved) return;
		movedArrow.current = null;
		const opposite = moved.direction === "up" ? "down" : "up";
		const direction = canMove(moved.id, moved.direction)
			? moved.direction
			: opposite;
		containerRef.current
			?.querySelector<HTMLButtonElement>(
				`[data-move="${moved.id}:${direction}"]`
			)
			?.focus();
	}, [canMove]);
	const rememberMove = useCallback(
		(id: string, direction: MoveDirection): void => {
			movedArrow.current = { id, direction };
		},
		[]
	);
	return { containerRef, rememberMove };
};
