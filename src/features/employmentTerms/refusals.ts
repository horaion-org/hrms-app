import type { TFunction } from "i18next";
import { z } from "zod";
import { ApiProblemError } from "@/common/problem";
import { mapRefusal, type Refusal } from "@/common/refusal";
import type { TermsFormValues } from "@/features/employmentTerms/termsForm";

/** The dialog's fields a refusal can point at. */
export type TermsField = keyof Pick<
	TermsFormValues,
	| "name"
	| "description"
	| "daysPerWeek"
	| "dayHours"
	| "weekHours"
	| "restWeekday"
>;

/** The refusal's `memberCount` extension. */
const memberCountSchema = z.object({ memberCount: z.number().int() });

/** How many people's own hours stand above corrected terms (`409 CONTRACTED_HOURS_ABOVE_CORRECTED_TERMS`). */
const ownHoursAboveCount = (error: unknown): number => {
	if (!(error instanceof ApiProblemError)) return 0;
	const parsed = memberCountSchema.safeParse(error.body);
	return parsed.success ? parsed.data.memberCount : 0;
};

/** Saving terms: server codes choose the app's own copy; server prose is never shown. */
export const termsSaveRefusal = (
	error: unknown,
	name: string,
	t: TFunction
): Refusal<TermsField> => {
	const key = "employmentTerms.dialog";
	return mapRefusal<TermsField>(error, {
		codes: {
			"409 EMPLOYMENT_TERMS_NAME_TAKEN": {
				field: "name",
				message: t(`${key}.nameTaken`, { name: name.trim() }),
			},
		},
		alerts: {
			"409 EMPLOYMENT_TERMS_HELD": t(`${key}.held`),
			"400 EMPLOYMENT_TERMS_START_NOT_MONDAY": t(
				"employmentTerms.apply.notMonday"
			),
			"404 EMPLOYMENT_TERMS_NOT_FOUND": t(`${key}.gone`),
			"409 CONTRACTED_HOURS_ABOVE_CORRECTED_TERMS": t(
				"employmentTerms.apply.ownHoursAbove",
				{ count: ownHoursAboveCount(error) }
			),
		},
		// Every rule the API finds broken comes back, each under its field.
		fieldErrors: {
			name: { field: "name", message: t(`${key}.rejected`) },
			description: {
				field: "description",
				message: t(`${key}.descriptionLength`),
			},
			daysPerWeek: { field: "daysPerWeek", message: t(`${key}.daysInvalid`) },
			dayMinutes: { field: "dayHours", message: t(`${key}.dayRejected`) },
			weekMinutes: { field: "weekHours", message: t(`${key}.weekRejected`) },
			restDay: { field: "restWeekday", message: t(`${key}.restDayRequired`) },
			dailyOvertime: { field: "dayHours", message: t(`${key}.dailyNeedsDay`) },
			shiftWork: { field: "dayHours", message: t(`${key}.shiftNoDaily`) },
		},
		forbidden: t(`${key}.forbidden`),
		failed: t(`${key}.failed`),
	});
};

/**
 * Whether the API refused saving a week because people hold the terms. The
 * app's own count can miss holders (people only on past weeks), so this
 * refusal always leads to the "how should this change apply?" step.
 */
export const isHeldRefusal = (error: unknown): boolean =>
	error instanceof ApiProblemError &&
	error.status === 409 &&
	error.errorCode === "EMPLOYMENT_TERMS_HELD";

/** Saving from the "how should this change apply?" step: one sentence for the step. */
export const applyChangeRefusal = (
	error: unknown,
	newName: string | undefined,
	t: TFunction
): string => {
	const refusal = mapRefusal<"startsOn" | "name">(error, {
		alerts: {
			"409 EMPLOYMENT_TERMS_NAME_TAKEN": t("employmentTerms.dialog.nameTaken", {
				name: newName?.trim() ?? "",
			}),
			"400 EMPLOYMENT_TERMS_START_NOT_MONDAY": t(
				"employmentTerms.apply.notMonday"
			),
			"409 CONTRACTED_HOURS_ABOVE_CORRECTED_TERMS": t(
				"employmentTerms.apply.ownHoursAbove",
				{ count: ownHoursAboveCount(error) }
			),
			"404 EMPLOYMENT_TERMS_NOT_FOUND": t("employmentTerms.dialog.gone"),
		},
		fieldErrors: {
			startsOn: {
				field: "startsOn",
				message: t("employmentTerms.apply.notMonday"),
			},
			previousTermsName: {
				field: "name",
				message: t("employmentTerms.apply.successorRejected"),
			},
			"newTerms.name": {
				field: "name",
				message: t("employmentTerms.apply.successorRejected"),
			},
		},
		forbidden: t("employmentTerms.dialog.forbidden"),
		failed: t("employmentTerms.dialog.failed"),
	});
	return (
		refusal.message ??
		refusal.fields.startsOn ??
		refusal.fields.name ??
		t("employmentTerms.dialog.failed")
	);
};

/** Deactivating, activating, defaulting or deleting terms from the list. */
export const termsRowRefusal = (error: unknown, t: TFunction): string => {
	const key = "employmentTerms.panel.refusal";
	return (
		mapRefusal(error, {
			alerts: {
				"404 EMPLOYMENT_TERMS_NOT_FOUND": t(`${key}.gone`),
				"409 DEFAULT_EMPLOYMENT_TERMS": t(`${key}.isDefault`),
				"409 EMPLOYMENT_TERMS_HELD": t(`${key}.held`),
				"409 EMPLOYMENT_TERMS_INACTIVE": t(`${key}.inactive`),
			},
			forbidden: t(`${key}.forbidden`),
			failed: t(`${key}.failed`),
		}).message ?? t(`${key}.failed`)
	);
};

/** Giving, correcting or cancelling one person's terms. */
export const memberTermsRefusal = (
	error: unknown,
	t: TFunction
): Refusal<"termsId" | "effectiveFrom" | "ownWeek" | "ownDay"> => {
	const key = "employmentTerms.change";
	return mapRefusal<"termsId" | "effectiveFrom" | "ownWeek" | "ownDay">(error, {
		codes: {
			"400 EMPLOYMENT_TERMS_START_NOT_MONDAY": {
				field: "effectiveFrom",
				message: t(`${key}.notMonday`),
			},
			"400 EMPLOYMENT_TERMS_BEFORE_FIRST_ENTRY": {
				field: "effectiveFrom",
				message: t(`${key}.beforeFirst`),
			},
			"409 EMPLOYMENT_TERMS_CHANGE_EXISTS": {
				field: "effectiveFrom",
				message: t(`${key}.exists`),
			},
			"400 CONTRACTED_HOURS_ABOVE_TERMS": {
				field: "ownWeek",
				message: t(`${key}.aboveTerms`),
			},
			"409 EMPLOYMENT_TERMS_INACTIVE": {
				field: "termsId",
				message: t(`${key}.inactive`),
			},
		},
		alerts: {
			"404 MEMBER_EMPLOYMENT_TERMS_NOT_FOUND": t(`${key}.gone`),
			"404 EMPLOYMENT_TERMS_NOT_FOUND": t(`${key}.inactive`),
			"409 EMPLOYMENT_TERMS_CHANGE_STARTED": t(
				"employmentTerms.history.started"
			),
		},
		fieldErrors: {
			dayWithinWeek: { field: "ownDay", message: t(`${key}.ownDayAboveWeek`) },
			contractedWeekMinutes: {
				field: "ownWeek",
				message: t(`${key}.aboveTerms`),
			},
			contractedDayMinutes: {
				field: "ownDay",
				message: t(`${key}.aboveTerms`),
			},
			effectiveFrom: {
				field: "effectiveFrom",
				message: t(`${key}.fromRequired`),
			},
		},
		forbidden: t(`${key}.forbidden`),
		failed: t(`${key}.failed`),
	});
};
