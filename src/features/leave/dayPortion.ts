import type { TFunction } from "i18next";
import type { SelectOption } from "@/components/forms/Select";
import type {
	LeaveDurationOption,
	LeaveRequest,
	LeaveRequestBody,
} from "@/features/leave/api";
import { durationText } from "@/features/leave/leaveLength";

/*
 * How much of one day a leave request takes (the API's ADR-0077): the full
 * day, one of the person's leave durations, or their own times (Custom). A
 * part day counts the hours between its times; whole days count in days.
 */

/** What the "How much of the day" choice holds. */
export type DayPortionChoice =
	| { kind: "FULL_DAY" }
	| { kind: "DURATION"; durationId: string }
	| { kind: "CUSTOM" };

/** The option values of the two choices that are not a duration; a duration is valued by its id. */
export const FULL_DAY_VALUE = "FULL_DAY";
export const CUSTOM_VALUE = "CUSTOM";

/** "09:00–13:00", or "22:00–02:00 next day" when the end is before the start. */
export const timeRangeText = (
	start: string,
	end: string,
	t: TFunction
): string =>
	t(
		end < start ? "leave.portion.timeRangeNextDay" : "leave.portion.timeRange",
		{
			start,
			end,
		}
	);

/**
 * The choices as Select options: Full day first, each duration as
 * "Morning · 09:00–13:00 · 4 h" in the API's order, then Custom.
 */
export const dayPortionOptions = (
	durations: ReadonlyArray<LeaveDurationOption>,
	t: TFunction
): Array<SelectOption> => [
	{ value: FULL_DAY_VALUE, label: t("leave.portion.fullDay") },
	...durations.map((duration) => ({
		value: duration.leaveDurationId,
		label: t("leave.portion.option", {
			name: duration.name,
			range: timeRangeText(duration.startTime, duration.endTime, t),
			length: durationText(duration.minutes, t),
		}),
	})),
	{ value: CUSTOM_VALUE, label: t("leave.portion.custom") },
];

/** The choice an option value stands for. */
export const dayPortionChoiceOf = (value: string): DayPortionChoice => {
	if (value === FULL_DAY_VALUE) return { kind: "FULL_DAY" };
	if (value === CUSTOM_VALUE) return { kind: "CUSTOM" };
	return { kind: "DURATION", durationId: value };
};

/** What the choice adds to the body: nothing for the full day, the duration alone, or Custom's two times. */
export const dayPortionBody = (
	choice: DayPortionChoice,
	custom: { start: string; end: string }
): Pick<LeaveRequestBody, "leaveDurationId" | "startTime" | "endTime"> => {
	if (choice.kind === "DURATION") return { leaveDurationId: choice.durationId };
	if (choice.kind === "CUSTOM")
		return { startTime: custom.start, endTime: custom.end };
	return {};
};

/** How much leave a request takes: "4 h" for part of a day, otherwise "3 days". */
export const amountText = (
	request: Pick<LeaveRequest, "workingDays" | "leaveMinutes">,
	t: TFunction
): string =>
	request.leaveMinutes === null
		? t("leave.days", { count: request.workingDays })
		: durationText(request.leaveMinutes, t);

/**
 * Which part of the day a request takes, "Morning 09:00–13:00" or
 * "Custom 10:00–12:00"; undefined for whole days.
 */
export const portionText = (
	request: Pick<LeaveRequest, "durationName" | "startTime" | "endTime">,
	t: TFunction
): string | undefined => {
	if (request.startTime === null || request.endTime === null) return undefined;
	return t("leave.portion.text", {
		name: request.durationName ?? t("leave.portion.custom"),
		range: timeRangeText(request.startTime, request.endTime, t),
	});
};
