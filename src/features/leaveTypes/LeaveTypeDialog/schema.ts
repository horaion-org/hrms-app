import type { TFunction } from "i18next";
import { z } from "zod";
import { unitNameSchema } from "@/features/organisation/createSchemas";
import {
	countsTowardsWorkHoursOf,
	LISTED_GRANT_KINDS,
	type LeaveGrantKind,
	type LeaveTypeBody,
	type ManagedLeaveType,
} from "@/features/leaveTypes/api";
import {
	reachValueOf,
	unitReachBody,
	unitReachSchema,
	type UnitReachValue,
} from "@/features/workspace/unitReach";
import { NAME_LIMITS } from "@/features/organisation/nameSchema";

const key = "settings.leave.dialog";

/** Mirrors the API's rules for a leave type; whether the name is free stays the API's decision. */
export const leaveTypeSchema = (
	t: TFunction
): z.ZodObject<{
	name: z.ZodString;
	grantKind: z.ZodEnum<{
		ALLOWANCE: "ALLOWANCE";
		PER_OCCASION: "PER_OCCASION";
		EARNED: "EARNED";
		UNTRACKED: "UNTRACKED";
	}>;
	paid: z.ZodBoolean;
	countsTowardsWorkHours: z.ZodBoolean;
	requiresReason: z.ZodBoolean;
	allowsPartDays: z.ZodBoolean;
	reach: z.ZodType<UnitReachValue, UnitReachValue>;
}> =>
	z.object({
		name: unitNameSchema({
			required: t(`${key}.nameRequired`),
			length: t(`${key}.nameLength`, NAME_LIMITS),
			characters: t(`${key}.nameCharacters`),
		}),
		grantKind: z.enum(LISTED_GRANT_KINDS),
		paid: z.boolean(),
		countsTowardsWorkHours: z.boolean(),
		requiresReason: z.boolean(),
		allowsPartDays: z.boolean(),
		reach: unitReachSchema(t),
	});

export type LeaveTypeValues = z.infer<ReturnType<typeof leaveTypeSchema>>;

/** Where the form starts: the type being edited, or a new paid yearly allowance for the whole company that counts towards work hours and can be taken in part days. */
export const initialLeaveTypeValues = (
	editing: (ManagedLeaveType & { grantKind: LeaveGrantKind }) | undefined
): LeaveTypeValues => ({
	name: editing?.name ?? "",
	grantKind: editing?.grantKind ?? "ALLOWANCE",
	paid: editing?.paid ?? true,
	countsTowardsWorkHours: editing ? countsTowardsWorkHoursOf(editing) : true,
	requiresReason: editing?.requiresReason ?? false,
	allowsPartDays: editing?.allowsPartDays ?? true,
	reach: reachValueOf(editing),
});

/** What the form sends. */
export const leaveTypeBodyOf = (values: LeaveTypeValues): LeaveTypeBody => ({
	name: values.name,
	grantKind: values.grantKind,
	paid: values.paid,
	countsTowardsWorkHours: values.countsTowardsWorkHours,
	requiresReason: values.requiresReason,
	allowsPartDays: values.allowsPartDays,
	...unitReachBody(values.reach),
});

/** The work-hours setting after Paid changes: a new type's follows Paid until the person sets it themselves. */
export const countsTowardsWorkHoursAfterPaidChange = ({
	adding,
	setByPerson,
	paid,
	countsTowardsWorkHours,
}: {
	adding: boolean;
	setByPerson: boolean;
	paid: boolean;
	countsTowardsWorkHours: boolean;
}): boolean => (adding && !setByPerson ? paid : countsTowardsWorkHours);
