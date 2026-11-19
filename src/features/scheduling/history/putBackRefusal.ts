import type { TFunction } from "i18next";
import { mapRefusal } from "@/common/refusal";
import { SCHEDULE_REFUSAL_CODES } from "@/features/scheduling/schedules/scheduleRefusal";

/**
 * The refusals of putting a deleted schedule back, as `"<status> <errorCode>"`;
 * "not found" is the schedules API's own.
 */
export const PUT_BACK_REFUSAL_CODES = {
	notRestorable: "409 SCHEDULE_NOT_RESTORABLE",
	daysTaken: "409 SCHEDULE_PUT_BACK_DAYS_TAKEN",
} as const;

const key = "scheduling.history.putBack";

/**
 * Why a deleted roster could not be put back, as one message for its dialog:
 * a run replaced it, its days (or later days of its week) hold another roster,
 * it is no longer in History, or the key is not held. The days in the way are
 * not named: the refusal carries them only inside its message, which is the
 * API's prose and is never shown.
 */
export const putBackRefusal = (error: unknown, t: TFunction): string =>
	mapRefusal<never>(error, {
		alerts: {
			[PUT_BACK_REFUSAL_CODES.notRestorable]: t(`${key}.notRestorable`),
			[PUT_BACK_REFUSAL_CODES.daysTaken]: t(`${key}.daysTakenUnnamed`),
			[SCHEDULE_REFUSAL_CODES.scheduleNotFound]: t(`${key}.gone`),
		},
		forbidden: t(`${key}.forbidden`),
		failed: t(`${key}.failed`),
	}).message ?? t(`${key}.failed`);
