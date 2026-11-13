import type {
	LeaveDurationOrderBody,
	ManagedLeaveDuration,
	UpdateLeaveDurationBody,
} from "@/features/leaveDurations/api";
import { reachValueOf, unitReachBody } from "@/features/workspace/unitReach";

/** The company order, then by name for any tie. */
export const byDisplayOrder = (
	first: ManagedLeaveDuration,
	second: ManagedLeaveDuration
): number =>
	first.displayOrder - second.displayOrder ||
	first.name.localeCompare(second.name);

/**
 * The order to send when one duration moves up or down the company list:
 * every duration in its new order, since the API takes the whole set. Null
 * when it cannot move that way (it is first or last, or not in the list).
 */
export const movedOrder = (
	durations: ReadonlyArray<ManagedLeaveDuration>,
	leaveDurationId: string,
	direction: "up" | "down"
): LeaveDurationOrderBody | null => {
	const ids = [...durations]
		.sort(byDisplayOrder)
		.map((duration) => duration.leaveDurationId);
	const from = ids.indexOf(leaveDurationId);
	const to = direction === "up" ? from - 1 : from + 1;
	if (from < 0 || to < 0 || to >= ids.length) return null;
	ids.splice(to, 0, ...ids.splice(from, 1));
	return { leaveDurationIds: ids };
};

/**
 * The full replacement that only flips a duration between active and
 * inactive. It sends the duration's times and reach back as they are, since
 * the API replaces them.
 */
export const statusToggleBody = (
	duration: ManagedLeaveDuration
): UpdateLeaveDurationBody => ({
	name: duration.name,
	startTime: duration.startTime,
	endTime: duration.endTime,
	...unitReachBody(reachValueOf(duration)),
	status: duration.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
});
