import {
	queryOptions,
	skipToken,
	type UndefinedInitialDataOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, apiRequestVoid } from "@/common/api-client";
import {
	SCHEDULING_QUERY_ROOT,
	constraintOptionsPath,
	constraintsPath,
	type DepartmentPath,
} from "@/features/scheduling/paths";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * The constraints API: one live set of scheduling constraints per
 * Department, read and changed under the `constraint` keys at the
 * Department's routes. A draft schedule only remembers which of them are
 * ticked (`schedules/api.ts`), so editing or deleting a live constraint
 * changes every draft of that Department. What each type takes is not
 * written here: `constraint-options` answers every type with its fields, how
 * many values of each and their ranges, and the constraint dialog builds its
 * form from that. Paths, fields and codes follow the API's
 * `docs/implementation/2026-10-12-scheduling-constraints.md` and ADR-0050.
 */

export const constraintTypeSchema = z.enum([
	"SHIFT_STAFFING",
	"SHIFT_STAFFING_WITH_STAND_INS",
	"ROLE_PRESENCE",
	"DAYS_OFF_PER_PERIOD",
	"AVOID_DAYS_OFF_ON",
	"REST_BETWEEN_SHIFTS",
]);

/** What a constraint says; its copy (label and sentence) is keyed by this name. */
export type ConstraintType = z.infer<typeof constraintTypeSchema>;

export const CONSTRAINT_TYPES = constraintTypeSchema.options;

export const constraintCategorySchema = z.enum([
	"STAFFING",
	"ROLE_COVERAGE",
	"SHIFT_PATTERN",
	"WORKING_HOURS",
]);

/** The group a constraint type is listed under. */
export type ConstraintCategory = z.infer<typeof constraintCategorySchema>;

export const CONSTRAINT_CATEGORIES = constraintCategorySchema.options;

const constraintFieldSchema = z.enum([
	"COMPARISON",
	"HEADCOUNT",
	"STAND_INS_PER_PERSON",
	"DAYS_OFF",
	"PERIOD_DAYS",
	"REST_HOURS",
	"JOB_TITLE",
	"STAND_IN_JOB_TITLE",
	"SHIFT",
	"WEEKDAY",
]);

/** One field a constraint type takes; its label is keyed by this name. */
export type ConstraintField = z.infer<typeof constraintFieldSchema>;

const constraintFieldKindSchema = z.enum([
	"NUMBER",
	"COMPARISON",
	"WEEKDAY",
	"JOB_TITLE",
	"SHIFT",
]);

/** What a field's values are, which decides the control that chooses them. */
export type ConstraintFieldKind = z.infer<typeof constraintFieldKindSchema>;

export const constraintRequirementSchema = z.enum(["MUST", "SHOULD"]);

/** Whether the engine must keep a constraint or should try to. */
export type ConstraintRequirement = z.infer<typeof constraintRequirementSchema>;

export const CONSTRAINT_REQUIREMENTS = constraintRequirementSchema.options;

const constraintStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

/** Only an ACTIVE constraint can be ticked by a draft, or frozen by a generation. */
export type ConstraintStatus = z.infer<typeof constraintStatusSchema>;

export const CONSTRAINT_STATUSES = constraintStatusSchema.options;

/** How a constraint's number is compared, as a COMPARISON value names it. */
export const CONSTRAINT_COMPARISONS = [
	"AT_LEAST",
	"AT_MOST",
	"EXACTLY",
] as const;

export type ConstraintComparison = (typeof CONSTRAINT_COMPARISONS)[number];

export const constraintValueSchema = z.object({
	field: constraintFieldSchema,
	/** As the API takes it: a number, a comparison or weekday name, or a job title's or shift's id. */
	value: z.string(),
	/** The job title's or shift's current name; null for a plain value. */
	name: z.string().nullable(),
});

/** One value of a constraint; a list field has one per item. */
export type ConstraintValue = z.infer<typeof constraintValueSchema>;

const departmentConstraintSchema = z.object({
	constraintId: z.string(),
	departmentId: z.string(),
	name: z.string(),
	type: constraintTypeSchema,
	category: constraintCategorySchema,
	/** Null for a type that gives no choice. */
	requirement: constraintRequirementSchema.nullable(),
	status: constraintStatusSchema,
	/** By the type's field order, then by name, then by value (weekdays Monday first). */
	values: z.array(constraintValueSchema),
	createdAt: z.string(),
	updatedAt: z.string(),
});

/** One of a Department's live constraints, as the constraint routes answer it. */
export type DepartmentConstraint = z.infer<typeof departmentConstraintSchema>;

/** What creating or replacing a live constraint sends. */
export type ConstraintBody = {
	name: string;
	type: ConstraintType;
	/** Null for a type that gives no choice. */
	requirement: ConstraintRequirement | null;
	status: ConstraintStatus;
	/** One entry per value, a list field one per item. */
	values: Array<Pick<ConstraintValue, "field" | "value">>;
};

const constraintPath = (
	companyId: string,
	unit: DepartmentPath,
	constraintId: string
): string =>
	`${constraintsPath(companyId, unit)}/${encodeURIComponent(constraintId)}`;

/** Adds a live constraint to a Department; every draft of it can then tick it. */
export const createConstraint = (
	companyId: string,
	unit: DepartmentPath,
	body: ConstraintBody
): Promise<DepartmentConstraint> =>
	apiRequest(constraintsPath(companyId, unit), departmentConstraintSchema, {
		method: "POST",
		body,
	});

/** Replaces a live constraint, its type included; every draft that ticks it sees the change. */
export const updateConstraint = (
	companyId: string,
	unit: DepartmentPath,
	constraintId: string,
	body: ConstraintBody
): Promise<DepartmentConstraint> =>
	apiRequest(
		constraintPath(companyId, unit, constraintId),
		departmentConstraintSchema,
		{
			method: "PUT",
			body,
		}
	);

/** Deletes a live constraint; it disappears from every draft. Generated schedules keep their copies. */
export const deleteConstraint = (
	companyId: string,
	unit: DepartmentPath,
	constraintId: string
): Promise<void> =>
	apiRequestVoid(constraintPath(companyId, unit, constraintId), {
		method: "DELETE",
	});

const departmentConstraintsSchema = z.array(departmentConstraintSchema);

/** A Department's live constraints, active and inactive, by name. */
export const fetchConstraints = (
	companyId: string,
	unit: DepartmentPath,
	signal?: AbortSignal
): Promise<Array<DepartmentConstraint>> =>
	apiRequest(constraintsPath(companyId, unit), departmentConstraintsSchema, {
		signal,
	});

/** The key a Department's live constraints are cached under. */
export const constraintsKey = (
	companyId: string,
	departmentId: string
): readonly ["scheduling", string, "departments", string, "constraints"] =>
	[
		SCHEDULING_QUERY_ROOT,
		companyId,
		"departments",
		departmentId,
		"constraints",
	] as const;

/** A Department's live constraints; `unit` undefined, or `allowed` false, asks for nothing. */
export const constraintsQuery = (
	companyId: string,
	unit: DepartmentPath | undefined,
	allowed = true
): UndefinedInitialDataOptions<
	Array<DepartmentConstraint>,
	Error,
	Array<DepartmentConstraint>,
	ReturnType<typeof constraintsKey>
> =>
	queryOptions({
		queryKey: constraintsKey(companyId, unit?.departmentId ?? ""),
		queryFn:
			allowed && unit
				? ({ signal }): Promise<Array<DepartmentConstraint>> =>
						fetchConstraints(companyId, unit, signal)
				: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});

const constraintFieldSpecSchema = z.object({
	field: constraintFieldSchema,
	kind: constraintFieldKindSchema,
	/** How many values of the field a constraint holds. */
	minCount: z.number(),
	maxCount: z.number(),
	/** A number field's range; null for any other kind. */
	min: z.number().nullable(),
	max: z.number().nullable(),
});

/** One field a constraint type takes, as the API declares it. */
export type ConstraintFieldSpec = z.infer<typeof constraintFieldSpecSchema>;

const constraintTypeOptionSchema = z.object({
	type: constraintTypeSchema,
	category: constraintCategorySchema,
	/** Whether a constraint of the type is a Must or a Should; without, it sends none. */
	hasRequirement: z.boolean(),
	/** Whether a Department may hold only one constraint of the type. */
	onePerDepartment: z.boolean(),
	/** The fields it takes, in the order the dialog shows them. */
	fields: z.array(constraintFieldSpecSchema),
});

/** A constraint type and the fields it takes. */
export type ConstraintTypeOption = z.infer<typeof constraintTypeOptionSchema>;

const constraintOptionsSchema = z.object({
	/** Every constraint type, grouped by category. */
	types: z.array(constraintTypeOptionSchema),
	/** The Department's live shifts, by group then name. */
	shifts: z.array(z.object({ shiftId: z.string(), name: z.string() })),
	/** The Department's ACTIVE job titles, by name. */
	jobTitles: z.array(z.object({ jobTitleId: z.string(), name: z.string() })),
});

/** What the constraint dialog offers. */
export type ConstraintOptions = z.infer<typeof constraintOptionsSchema>;

/**
 * The constraint types with their fields, and the Department's live shifts and
 * ACTIVE job titles, under `constraint:read`, so a constraint editor never
 * needs `shift:read` or `job_title:read`.
 */
export const fetchConstraintOptions = (
	companyId: string,
	unit: DepartmentPath,
	signal?: AbortSignal
): Promise<ConstraintOptions> =>
	apiRequest(constraintOptionsPath(companyId, unit), constraintOptionsSchema, {
		signal,
	});

/** The key a Department's constraint options are cached under. */
export const constraintOptionsKey = (
	companyId: string,
	departmentId: string
): readonly [
	"scheduling",
	string,
	"departments",
	string,
	"constraint-options",
] =>
	[
		SCHEDULING_QUERY_ROOT,
		companyId,
		"departments",
		departmentId,
		"constraint-options",
	] as const;

/** A Department's constraint options; `unit` undefined, or `allowed` false, asks for nothing. */
export const constraintOptionsQuery = (
	companyId: string,
	unit: DepartmentPath | undefined,
	allowed = true
): UndefinedInitialDataOptions<
	ConstraintOptions,
	Error,
	ConstraintOptions,
	ReturnType<typeof constraintOptionsKey>
> =>
	queryOptions({
		queryKey: constraintOptionsKey(companyId, unit?.departmentId ?? ""),
		queryFn:
			allowed && unit
				? ({ signal }): Promise<ConstraintOptions> =>
						fetchConstraintOptions(companyId, unit, signal)
				: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});
