import type { TFunction } from "i18next";
import { mapRefusal, type Refusal } from "@/features/organisation/refusal";

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
} as const;

const codes = CONSTRAINT_REFUSAL_CODES;

/** The fields a refused constraint can land on; the rest is explained as the dialog's alert. */
export type ConstraintRefusalField = "name" | "type";

/** Why adding or editing a constraint was refused: on a field, or as the dialog's alert. */
export const constraintRefusal = (
	error: unknown,
	name: string,
	editing: boolean,
	t: TFunction
): Refusal<ConstraintRefusalField> => {
	const key = "scheduling.constraints.dialog";
	const field = (field: ConstraintRefusalField, message: string) =>
		({ field, message }) as const;
	return mapRefusal<ConstraintRefusalField>(error, {
		codes: {
			[codes.constraintNameConflict]: field(
				"name",
				t(`${key}.nameConflict`, { name })
			),
			[codes.invalidConstraintName]: field("name", t(`${key}.nameRejected`)),
			[codes.constraintTypeAlreadyUsed]: field(
				"type",
				t(`${key}.typeAlreadyUsed`)
			),
		},
		alerts: {
			[codes.invalidConstraint]: t(`${key}.invalid`),
			[codes.jobTitleNotInDepartment]: t(`${key}.jobTitleRejected`),
			[codes.shiftNotFound]: t(`${key}.shiftGone`),
			[codes.departmentInactive]: t(`${key}.departmentInactive`),
			[codes.departmentNotFound]: t(`${key}.departmentGone`),
			[codes.constraintNotFound]: t(`${key}.gone`),
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
