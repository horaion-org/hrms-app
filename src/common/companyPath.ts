/** The API path every company-scoped request starts from. */
export const companyPath = (companyId: string): string =>
	`/api/v1/companies/${encodeURIComponent(companyId)}`;

/** The Branch and Department a department-scoped route names. */
export type DepartmentPath = { branchId: string; departmentId: string };

/** One Department's routes; its shifts, constraints, schedules and availability sit under it. */
export const departmentPath = (
	companyId: string,
	{ branchId, departmentId }: DepartmentPath
): string =>
	`${companyPath(companyId)}/branches/${encodeURIComponent(branchId)}/departments/${encodeURIComponent(departmentId)}`;
