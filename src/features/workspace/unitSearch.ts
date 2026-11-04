import { z } from "zod";

/**
 * The URL fragment every list page names its units with, under the same
 * keys everywhere, so a later shared Branch context can carry `branch`
 * between pages. Spread into a page's search schema.
 */
export const unitSearchSchema = z.object({
	branch: z.string().min(1).optional().catch(undefined),
	department: z.string().min(1).optional().catch(undefined),
});

export type UnitSearch = z.infer<typeof unitSearchSchema>;

/** The Branch and Department a list is narrowed to; left out means every one in reach. */
export type UnitSelection = { branchId?: string; departmentId?: string };

/** The units as the URL keeps them, each left out when every unit is meant. */
export const unitSearchOf = ({
	branch,
	department,
}: UnitSearch): UnitSearch => ({
	...(branch === undefined ? {} : { branch }),
	...(department === undefined ? {} : { department }),
});

/** Reads a page's units from its URL, dropping anything it does not recognise. */
export const parseUnitSearch = (search: Record<string, unknown>): UnitSearch =>
	unitSearchOf(unitSearchSchema.parse(search));

/** The Branch every signed-in page carries: the person's choice, kept across pages. */
export type BranchContext = Pick<UnitSearch, "branch">;

/** Reads the shared Branch from any signed-in page's URL, dropping anything else. */
export const parseBranchContext = (
	search: Record<string, unknown>
): BranchContext => {
	const { branch } = unitSearchSchema.parse(search);
	return branch === undefined ? {} : { branch };
};

/** The units the URL names. */
export const unitSelectionOf = ({
	branch,
	department,
}: UnitSearch): UnitSelection => ({
	branchId: branch,
	departmentId: department,
});
