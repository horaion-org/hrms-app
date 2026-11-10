import type { TFunction } from "i18next";
import { mapRefusal, type Refusal } from "@/common/refusal";

export type SkillField = "name" | "category" | "description" | "validityMonths";

/** Server codes select frontend-owned copy; untrusted server prose is never displayed. */
export const refusalFor = (
	error: unknown,
	name: string,
	editing: boolean,
	t: TFunction
): Refusal<SkillField> => {
	const key = "organisation.skills.dialog";
	return mapRefusal<SkillField>(error, {
		codes: {
			"409 SKILL_NAME_CONFLICT": {
				field: "name",
				message: t(`${key}.nameConflict`, { name: name.trim() }),
			},
			"400 INVALID_SKILL_NAME": {
				field: "name",
				message: t(`${key}.nameRejected`),
			},
		},
		alerts: {
			"409 SKILL_MEASURE_IN_USE": t(`${key}.measureInUse`),
			"404 SKILL_NOT_FOUND": t(`${key}.gone`),
		},
		fieldErrors: {
			name: { field: "name", message: t(`${key}.nameRejected`) },
			category: { field: "category", message: t(`${key}.categoryRejected`) },
			description: {
				field: "description",
				message: t(`${key}.descriptionLength`),
			},
			validityMonths: {
				field: "validityMonths",
				message: t(`${key}.validityRange`),
			},
			validityWithExpiryTracking: {
				field: "validityMonths",
				message: t(`${key}.validityRange`),
			},
		},
		forbidden: t(editing ? `${key}.editForbidden` : `${key}.forbidden`),
		failed: t(editing ? `${key}.editFailed` : `${key}.failed`),
	});
};
