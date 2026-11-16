import type { TFunction } from "i18next";
import { z } from "zod";
import { DEFAULT_ALLOWS_SHIFT_SAME_DAY } from "@/features/leave/api";
import type {
	LeaveDurationBody,
	ManagedLeaveDuration,
} from "@/features/leaveDurations/api";
import type { ManageableReach } from "@/features/leaveDurations/manageableReach";
import { unitNameSchema } from "@/features/organisation/createSchemas";
import {
	reachValueOf,
	unitReachBody,
	unitReachSchema,
	type UnitReachValue,
} from "@/features/workspace/unitReach";
import { NAME_LIMITS } from "@/features/organisation/nameSchema";

const key = "settings.leave.durationDialog";

/** Mirrors the API's rules for a leave duration; whether the name is free where it applies stays the API's decision. */
export const leaveDurationSchema = (
	t: TFunction
): z.ZodType<LeaveDurationValues, LeaveDurationValues> =>
	z
		.object({
			name: unitNameSchema({
				required: t(`${key}.nameRequired`),
				length: t(`${key}.nameLength`, NAME_LIMITS),
				characters: t(`${key}.nameCharacters`),
			}),
			startTime: z.string().min(1, t(`${key}.timeRequired`)),
			endTime: z.string().min(1, t(`${key}.timeRequired`)),
			allowsShiftSameDay: z.boolean(),
			reach: unitReachSchema(t),
		})
		.refine((values) => values.startTime !== values.endTime, {
			path: ["endTime"],
			message: t(`${key}.timesEqual`),
		});

/** What the dialog's form holds. */
export type LeaveDurationValues = {
	name: string;
	startTime: string;
	endTime: string;
	allowsShiftSameDay: boolean;
	reach: UnitReachValue;
};

/**
 * Where the form starts: the duration being edited, or a new one that lets
 * the person still work a shift that day, on the first reach the person may
 * save, with their only Department picked when that reach is Chosen
 * departments and they hold just one.
 */
export const initialLeaveDurationValues = (
	editing: ManagedLeaveDuration | undefined,
	reach: ManageableReach
): LeaveDurationValues => {
	if (editing)
		return {
			name: editing.name,
			startTime: editing.startTime,
			endTime: editing.endTime,
			allowsShiftSameDay: editing.allowsShiftSameDay,
			reach: reachValueOf(editing),
		};
	const appliesTo = reach.reaches[0] ?? "COMPANY";
	const { departments } = reach.choices;
	const onlyDepartment =
		appliesTo === "DEPARTMENTS" && departments.length === 1
			? departments.map((department) => department.departmentId)
			: [];
	return {
		name: "",
		startTime: "",
		endTime: "",
		allowsShiftSameDay: DEFAULT_ALLOWS_SHIFT_SAME_DAY,
		reach: { appliesTo, branchIds: [], departmentIds: onlyDepartment },
	};
};

/** What the form sends. */
export const leaveDurationBodyOf = (
	values: LeaveDurationValues
): LeaveDurationBody => ({
	name: values.name,
	startTime: values.startTime,
	endTime: values.endTime,
	allowsShiftSameDay: values.allowsShiftSameDay,
	...unitReachBody(values.reach),
});
