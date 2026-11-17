import type { TFunction } from "i18next";
import type { TermsPreset } from "@/features/employmentTerms/api";
import { durationShort } from "@/features/employmentTerms/hours";
import {
	termsFormValuesOf,
	type TermsFormValues,
} from "@/features/employmentTerms/termsForm";

/*
 * "Start from": the API's presets fill the form once and then step aside
 * (the approved design). No figure lives here; each comes from the preset.
 */

/** The form once a starting point is clicked: everything from the preset, keeping the name and description typed. */
export const valuesOfPreset = (
	preset: TermsPreset,
	current: TermsFormValues
): TermsFormValues => ({
	...termsFormValuesOf(preset),
	name: current.name,
	description: current.description,
});

/** Whether the form still holds a preset's answers (the name and description aside). */
export const holdsPreset = (
	values: TermsFormValues,
	preset: TermsPreset
): boolean => {
	const fromPreset = termsFormValuesOf(preset);
	return (Object.keys(fromPreset) as Array<keyof TermsFormValues>)
		.filter((field) => field !== "name" && field !== "description")
		.every((field) => fromPreset[field] === values[field]);
};

/**
 * A starting point's line under its name: "44 h, rest day Sunday", "44 h,
 * rest day changes", "20 h, days vary", or, for terms outside the Act's hour
 * rules, "Not under the Act's hour rules".
 */
export const presetLine = (preset: TermsPreset, t: TFunction): string => {
	const key = "employmentTerms.dialog.startFromLine";
	const week = durationShort(preset.weekMinutes, t);
	if (!preset.hoursLimitsApply) return t(`${key}.notCovered`);
	if (preset.daysPerWeek === null) return t(`${key}.daysVary`, { week });
	if (preset.restDay === "ROSTERED" || preset.restDay === "UNKNOWN")
		return t(`${key}.restChanges`, { week });
	return t(`${key}.restOn`, {
		week,
		weekday: t(`weekdays.${preset.restDay}`),
	});
};
