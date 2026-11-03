import type { TFunction } from "i18next";
import { ApiProblemError } from "@/common/problem";
import { mapRefusal, type Refusal } from "@/features/organisation/refusal";
import {
	expandDrafts,
	type WindowDraft,
} from "@/features/people/availability/availabilityModel";
import { PROFILE_REFUSAL_CODES } from "@/features/people/profileRefusal";

/** An editor row, as the availability form names it. */
export type WindowRowField = `rows.${number}`;

const INVALID_WEEKLY_AVAILABILITY = "INVALID_WEEKLY_AVAILABILITY";
/** `windows[3]`, `windows[3].endTime`: the entry of the request an error names. */
const WINDOW_ENTRY = /^windows\[(\d+)\]/;

/**
 * Why saving a member's availability was refused. Each entry the API names
 * in `INVALID_WEEKLY_AVAILABILITY` lands on the row it was sent from (see
 * `expandDrafts`), with the dialog's alert saying some were refused; a
 * member who is no longer part-time and the rest are the alert. Server
 * codes select frontend-owned copy only.
 */
export const availabilityRefusal = (
	error: unknown,
	drafts: ReadonlyArray<WindowDraft>,
	t: TFunction
): Refusal<WindowRowField> => {
	const key = "people.availability.dialog";
	if (
		error instanceof ApiProblemError &&
		error.status === 400 &&
		error.errorCode === INVALID_WEEKLY_AVAILABILITY
	) {
		const sent = expandDrafts(drafts);
		const fields: Partial<Record<WindowRowField, string>> = {};
		for (const { field } of error.fieldErrors) {
			const entry = WINDOW_ENTRY.exec(field)?.[1];
			const row = entry === undefined ? undefined : sent[Number(entry)]?.row;
			if (row !== undefined) fields[`rows.${row}`] = t(`${key}.rejected`);
		}
		return { fields, message: t(`${key}.someRejected`), refreshMembers: false };
	}
	return mapRefusal<WindowRowField>(error, {
		alerts: {
			"409 AVAILABILITY_REQUIRES_PART_TIME": t(`${key}.notPartTime`),
			[PROFILE_REFUSAL_CODES.profileNotFound]: t("people.form.profileMissing"),
		},
		forbidden: t(`${key}.forbidden`),
		failed: t(`${key}.failed`),
	});
};
