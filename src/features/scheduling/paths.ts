import {
	companyPath,
	departmentPath,
	type DepartmentPath,
} from "@/common/companyPath";

/** Every scheduling query key starts `["scheduling", companyId, …]`. */
export const SCHEDULING_QUERY_ROOT = "scheduling";

/** A department's live shifts. */
export const shiftsPath = (companyId: string, unit: DepartmentPath): string =>
	`${departmentPath(companyId, unit)}/shifts`;

/** The live shifts of every department in reach across the company. */
export const companyShiftsPath = (companyId: string): string =>
	`${companyPath(companyId)}/shifts`;

/** A department's active job titles, as the shift dialog offers them. */
export const shiftRoleOptionsPath = (
	companyId: string,
	unit: DepartmentPath
): string => `${departmentPath(companyId, unit)}/shift-role-options`;

/** A department's live constraints. */
export const constraintsPath = (
	companyId: string,
	unit: DepartmentPath
): string => `${departmentPath(companyId, unit)}/constraints`;

/** The live constraints of every department in reach across the company, with the company's own first. */
export const companyConstraintsPath = (companyId: string): string =>
	`${companyPath(companyId)}/constraints`;

/** The constraint types with their fields, and the department's shifts and active job titles, as the constraint dialog offers them. */
export const constraintOptionsPath = (
	companyId: string,
	unit: DepartmentPath
): string => `${departmentPath(companyId, unit)}/constraint-options`;

/** A department's schedules. */
export const schedulesPath = (
	companyId: string,
	unit: DepartmentPath
): string => `${departmentPath(companyId, unit)}/schedules`;

/** One schedule of the company by its id alone, wherever its department is. */
export const companySchedulePath = (
	companyId: string,
	scheduleId: string
): string =>
	`${companyPath(companyId)}/schedules/${encodeURIComponent(scheduleId)}`;

/** One schedule of a department; its shifts, its constraints and its generation sit under it. */
export const schedulePath = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string
): string =>
	`${schedulesPath(companyId, unit)}/${encodeURIComponent(scheduleId)}`;

/** Whether each department in reach is ready to schedule (ADR-0071 in the API). */
export const schedulingReadinessPath = (companyId: string): string =>
	`${companyPath(companyId)}/scheduling-readiness`;

/** The company's schedules by month: the month summaries, and one Department's month below it. */
export const scheduleMonthsPath = (companyId: string): string =>
	`${companyPath(companyId)}/schedule-months`;

/** One month of schedules; the Department is a required query parameter. */
export const scheduleMonthPath = (companyId: string, month: string): string =>
	`${scheduleMonthsPath(companyId)}/${encodeURIComponent(month)}`;

/** What a Department needs before its month is generated; the Department is a required query parameter. */
export const scheduleMonthGenerationCheckPath = (
	companyId: string,
	month: string
): string => `${scheduleMonthPath(companyId, month)}/generation-check`;

/** Generating a Department's month; the Department is a required query parameter. */
export const scheduleMonthGenerationPath = (
	companyId: string,
	month: string
): string => `${scheduleMonthPath(companyId, month)}/generation`;
