import type { RosterShiftKind } from "@/features/scheduling/schedules";

/** A roster day's tile colours: each kind of shift, and a day off. */
export const rosterLooks: Record<RosterShiftKind | "off", string> = {
	full: "border-success-200 bg-success-50 text-success-900",
	half: "border-warning-200 bg-warning-50 text-warning-900",
	open: "border-error-200 bg-error-50 text-error-900",
	off: "border-neutral-400 bg-neutral-100 text-neutral-600",
};
