import { companyPath } from "@/features/organisation/api";

/** The Branch and Department a department-scoped route names. */
export type DepartmentPath = { branchId: string; departmentId: string };

/** Every scheduling query key starts `["scheduling", companyId, …]`. */
export const SCHEDULING_QUERY_ROOT = "scheduling";

/** A department's schedules. */
export const schedulesPath = (
	companyId: string,
	{ branchId, departmentId }: DepartmentPath
): string =>
	`${companyPath(companyId)}/branches/${encodeURIComponent(branchId)}/departments/${encodeURIComponent(departmentId)}/schedules`;

/** One schedule of a department; its shifts sit under it. */
export const schedulePath = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string
): string =>
	`${schedulesPath(companyId, unit)}/${encodeURIComponent(scheduleId)}`;
