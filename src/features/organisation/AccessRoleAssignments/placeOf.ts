import type { TFunction } from "i18next";
import type { AccessRoleAssignmentRow } from "@/features/organisation/AccessRoleAssignments/AccessRoleAssignments";

/** Where an assignment applies, in words: the whole company, a Branch, or a Branch and its Department. */
export const placeOf = (row: AccessRoleAssignmentRow, t: TFunction): string => {
	const key = "organisation.accessRoles.assignments";
	if (!row.branchName) return t(`${key}.wholeCompany`);
	if (!row.departmentName) return row.branchName;
	return t(`${key}.department`, {
		branch: row.branchName,
		department: row.departmentName,
	});
};
