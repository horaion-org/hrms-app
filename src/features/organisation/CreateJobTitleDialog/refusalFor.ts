import type { TFunction } from "i18next";
import { mapRefusal, type Refusal } from "@/features/organisation/refusal";

/** Server codes select frontend-owned copy; untrusted server prose is never displayed. */
export const refusalFor = (
	error: unknown,
	name: string,
	t: TFunction
): Refusal<"name"> => {
	const key = "organisation.jobTitles.createDialog";
	return mapRefusal(error, {
		codes: {
			"409 JOB_TITLE_NAME_CONFLICT": {
				field: "name",
				message: t(`${key}.nameConflict`, { name: name.trim() }),
			},
			"400 INVALID_JOB_TITLE_NAME": {
				field: "name",
				message: t(`${key}.nameRejected`),
			},
		},
		fieldErrors: { name: { field: "name", message: t(`${key}.nameRejected`) } },
		forbidden: t(`${key}.forbidden`),
		failed: t(`${key}.failed`),
	});
};
