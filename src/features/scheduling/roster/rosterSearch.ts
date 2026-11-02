import { z } from "zod";
import type { DepartmentPath } from "@/features/scheduling/paths";

const rosterSearchSchema = z.object({
	branchId: z.string().trim().min(1),
	departmentId: z.string().trim().min(1),
});

/**
 * The Department a roster URL names beside its schedule:
 * `/scheduling/$scheduleId?branchId=…&departmentId=…`. Every schedule read is
 * department-scoped, so both are required.
 */
export type RosterSearch = DepartmentPath;

/**
 * Reads the roster URL's Department, dropping anything else. Throws when
 * either id is missing or blank, so the route shows its problem instead of
 * asking the API for nothing.
 */
export const parseRosterSearch = (
	search: Record<string, unknown>
): RosterSearch => {
	const { branchId, departmentId } = rosterSearchSchema.parse(search);
	return { branchId, departmentId };
};
