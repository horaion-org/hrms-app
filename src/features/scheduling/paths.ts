import { companyPath } from "@/features/organisation/api";

/** The Branch and Department a department-scoped route names. */
export type DepartmentPath = { branchId: string; departmentId: string };

/** Every scheduling query key starts `["scheduling", companyId, …]`. */
export const SCHEDULING_QUERY_ROOT = "scheduling";

/** One Department's routes; its shifts, constraints and schedules sit under it. */
export const departmentPath = (
	companyId: string,
	{ branchId, departmentId }: DepartmentPath
): string =>
	`${companyPath(companyId)}/branches/${encodeURIComponent(branchId)}/departments/${encodeURIComponent(departmentId)}`;

/** A department's live shifts. */
export const shiftsPath = (companyId: string, unit: DepartmentPath): string =>
	`${departmentPath(companyId, unit)}/shifts`;

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

/** One schedule of a department; its shifts, its constraints and its generation sit under it. */
export const schedulePath = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string
): string =>
	`${schedulesPath(companyId, unit)}/${encodeURIComponent(scheduleId)}`;
