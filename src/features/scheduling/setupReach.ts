import type { TFunction } from "i18next";
import type { DepartmentConstraint } from "@/features/scheduling/constraints/api";
import type { Schedule } from "@/features/scheduling/schedules/api";

/*
 * What changing or deleting a department's live shift or constraint
 * reaches: new schedules, and every draft that ticks it. Generated and
 * published schedules keep their own frozen copies.
 */

/** The live shift or constraint being changed. */
export type SetupItem = { kind: "shift" | "constraint"; id: string };

/** How many draft schedules tick the item. */
export const draftsUsing = (
	schedules: ReadonlyArray<
		Pick<Schedule, "status" | "includedShiftIds" | "includedConstraintIds">
	>,
	item: SetupItem
): number =>
	schedules.filter(
		(schedule) =>
			schedule.status === "DRAFT" &&
			(item.kind === "shift"
				? schedule.includedShiftIds
				: schedule.includedConstraintIds
			).includes(item.id)
	).length;

/** How many of the department's own constraints name the shift; company constraints name no shift. */
export const constraintsNamingShift = (
	constraints: ReadonlyArray<Pick<DepartmentConstraint, "level" | "values">>,
	shiftId: string
): number =>
	constraints.filter(
		(constraint) =>
			constraint.level !== "COMPANY" &&
			constraint.values.some(
				(value) => value.field === "SHIFT" && value.value === shiftId
			)
	).length;

/**
 * The edit dialog's note on what saving reaches. `draftCount` is undefined
 * where the person may not read schedules, so the drafts go uncounted.
 */
export const editNote = (
	t: TFunction,
	kind: SetupItem["kind"],
	departmentName: string,
	draftCount?: number
): string => {
	const key = kind === "shift" ? "editShift" : "editConstraint";
	const department = departmentName;
	if (draftCount === undefined)
		return t(`scheduling.reach.${key}Unknown`, { department });
	if (draftCount === 0)
		return t(`scheduling.reach.${key}NoDrafts`, { department });
	return t(`scheduling.reach.${key}`, { department, count: draftCount });
};

/** What the delete confirmation says and asks. */
export type DeleteCopy = {
	title: string;
	description: string;
	confirmLabel: string;
};

/**
 * The delete confirmation's words: what the item is removed from and, for
 * a shift, how many of the department's constraints stop applying to it.
 * `draftCount` is undefined where the person may not read schedules.
 */
export const deleteCopy = (
	t: TFunction,
	kind: SetupItem["kind"],
	name: string,
	departmentName: string,
	draftCount?: number,
	namedBy?: number
): DeleteCopy => {
	const key = kind === "shift" ? "deleteShiftBody" : "deleteConstraintBody";
	const department = departmentName;
	const body =
		draftCount === undefined
			? t(`scheduling.reach.${key}Unknown`, { department })
			: draftCount === 0
				? t(`scheduling.reach.${key}NoDrafts`, { department })
				: t(`scheduling.reach.${key}`, { department, count: draftCount });
	const named = namedBy
		? t("scheduling.reach.namedByConstraints", { count: namedBy })
		: undefined;
	return {
		title: t("scheduling.reach.deleteTitle", { name }),
		description: named ? `${body} ${named}` : body,
		confirmLabel: t(
			kind === "shift"
				? "scheduling.reach.deleteShift"
				: "scheduling.reach.deleteConstraint"
		),
	};
};
