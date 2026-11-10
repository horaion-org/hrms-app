/** Which way a step moved: towards the first step or the last. */
export type MoveDirection = "up" | "down";

/**
 * The arrow that keeps focus after a step moves to `index`: the one pressed,
 * or, once the step reaches an end and that arrow is no longer usable, the
 * other one.
 */
export const movedFocusTarget = (
	index: number,
	direction: MoveDirection,
	lastIndex: number
): MoveDirection => {
	const atEnd =
		(direction === "up" && index === 0) ||
		(direction === "down" && index === lastIndex);
	if (!atEnd) return direction;
	return direction === "up" ? "down" : "up";
};
