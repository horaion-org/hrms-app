import type { TFunction } from "i18next";
import { z } from "zod";
import { unitNameSchema } from "@/features/organisation/createSchemas";
import {
	LEAVE_GRANT_KINDS,
	type LeaveGrantKind,
	type LeaveTypeBody,
	type ManagedLeaveType,
} from "@/features/leaveTypes/api";

const key = "settings.leave.dialog";

/** Mirrors the API's rules for a leave type; whether the name is free stays the API's decision. */
export const leaveTypeSchema = (
	t: TFunction
): z.ZodObject<{
	name: z.ZodString;
	grantKind: z.ZodEnum<{
		ALLOWANCE: "ALLOWANCE";
		PER_OCCASION: "PER_OCCASION";
		UNTRACKED: "UNTRACKED";
	}>;
	paid: z.ZodBoolean;
	requiresReason: z.ZodBoolean;
}> =>
	z.object({
		name: unitNameSchema({
			required: t(`${key}.nameRequired`),
			length: t(`${key}.nameLength`),
			characters: t(`${key}.nameCharacters`),
		}),
		grantKind: z.enum(LEAVE_GRANT_KINDS),
		paid: z.boolean(),
		requiresReason: z.boolean(),
	});

export type LeaveTypeValues = z.infer<ReturnType<typeof leaveTypeSchema>>;

/** Where the form starts: the type being edited, or a new paid yearly allowance. */
export const initialLeaveTypeValues = (
	editing: (ManagedLeaveType & { grantKind: LeaveGrantKind }) | undefined
): LeaveTypeValues => ({
	name: editing?.name ?? "",
	grantKind: editing?.grantKind ?? "ALLOWANCE",
	paid: editing?.paid ?? true,
	requiresReason: editing?.requiresReason ?? false,
});

/** What the form sends. */
export const leaveTypeBodyOf = (values: LeaveTypeValues): LeaveTypeBody => ({
	name: values.name,
	grantKind: values.grantKind,
	paid: values.paid,
	requiresReason: values.requiresReason,
});
