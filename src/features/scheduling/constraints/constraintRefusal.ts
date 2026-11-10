import type { TFunction } from "i18next";
import { mapRefusal, type Refusal } from "@/common/refusal";

/**
 * The refusals of the constraints API, as `"<status> <errorCode>"`. Every code
 * is named here once, so a code the API settles on differently is a one-line
 * change.
 */
export const CONSTRAINT_REFUSAL_CODES = {
	invalidConstraint: "400 INVALID_CONSTRAINT",
	invalidConstraintName: "400 INVALID_CONSTRAINT_NAME",
	jobTitleNotInDepartment: "400 CONSTRAINT_JOB_TITLE_NOT_IN_DEPARTMENT",
	constraintNameConflict: "409 CONSTRAINT_NAME_CONFLICT",
	constraintTypeAlreadyUsed: "409 CONSTRAINT_TYPE_ALREADY_USED",
	constraintNotFound: "404 CONSTRAINT_NOT_FOUND",
	shiftNotFound: "404 SHIFT_NOT_FOUND",
	departmentInactive: "409 DEPARTMENT_INACTIVE",
	departmentNotFound: "404 DEPARTMENT_NOT_FOUND",
	overrideNotStricter: "409 CONSTRAINT_OVERRIDE_NOT_STRICTER",
	overrideInvalid: "400 INVALID_CONSTRAINT_OVERRIDE",
	alreadyOverridden: "409 CONSTRAINT_ALREADY_OVERRIDDEN",
	typeSetByCompany: "409 CONSTRAINT_TYPE_SET_BY_COMPANY",
	levelNotAllowed: "400 CONSTRAINT_LEVEL_NOT_ALLOWED",
	typeFixed: "400 CONSTRAINT_TYPE_FIXED",
} as const;

const codes = CONSTRAINT_REFUSAL_CODES;

/** The fields a refused constraint can land on; the rest is explained as the dialog's alert. */
export type ConstraintRefusalField = "name" | "type";

/** What was being saved when a constraint was refused. */
export type ConstraintRefusalContext = {
	name: string;
	editing: boolean;
	/** The company's Scheduling policy, not a department's constraints, so the copy names the company. */
	company: boolean;
};

/** Why adding or editing a constraint was refused: on a field, or as the dialog's alert. */
export const constraintRefusal = (
	error: unknown,
	{ name, editing, company }: ConstraintRefusalContext,
	t: TFunction
): Refusal<ConstraintRefusalField> => {
	const key = "scheduling.constraints.dialog";
	const field = (field: ConstraintRefusalField, message: string) =>
		({ field, message }) as const;
	return mapRefusal<ConstraintRefusalField>(error, {
		codes: {
			[codes.constraintNameConflict]: field(
				"name",
				t(company ? `${key}.nameConflictCompany` : `${key}.nameConflict`, {
					name,
				})
			),
			[codes.invalidConstraintName]: field("name", t(`${key}.nameRejected`)),
			[codes.constraintTypeAlreadyUsed]: field(
				"type",
				t(company ? `${key}.typeAlreadyUsedCompany` : `${key}.typeAlreadyUsed`)
			),
			[codes.typeSetByCompany]: field("type", t(`${key}.typeSetByCompany`)),
			[codes.levelNotAllowed]: field("type", t(`${key}.levelNotAllowed`)),
			[codes.typeFixed]: field("type", t(`${key}.typeFixed`)),
		},
		alerts: {
			[codes.invalidConstraint]: t(`${key}.invalid`),
			[codes.jobTitleNotInDepartment]: t(`${key}.jobTitleRejected`),
			[codes.shiftNotFound]: t(`${key}.shiftGone`),
			[codes.departmentInactive]: t(`${key}.departmentInactive`),
			[codes.departmentNotFound]: t(`${key}.departmentGone`),
			[codes.constraintNotFound]: t(`${key}.gone`),
			[codes.overrideNotStricter]: t(`${key}.notStricter`),
			[codes.overrideInvalid]: t(`${key}.overrideInvalid`),
			[codes.alreadyOverridden]: t(`${key}.alreadyOverridden`),
		},
		fieldErrors: {
			name: field("name", t(`${key}.nameRejected`)),
		},
		forbidden: t(editing ? `${key}.editForbidden` : `${key}.forbidden`),
		failed: t(editing ? `${key}.editFailed` : `${key}.failed`),
	});
};

/** Why deleting a constraint was refused, as one message for the page. */
export const deleteConstraintRefusal = (
	error: unknown,
	t: TFunction
): string => {
	const key = "scheduling.constraints";
	return (
		mapRefusal<never>(error, {
			alerts: {
				[codes.constraintNotFound]: t(`${key}.dialog.gone`),
				[codes.departmentNotFound]: t(`${key}.dialog.departmentGone`),
			},
			forbidden: t(`${key}.deleteForbidden`),
			failed: t(`${key}.deleteFailed`),
		}).message ?? t(`${key}.deleteFailed`)
	);
};
