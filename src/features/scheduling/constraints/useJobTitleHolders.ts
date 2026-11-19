import { useJobTitles } from "@/features/organisation/useOrganisationList";
import type { HoldersByJobTitle } from "@/features/scheduling/constraints/capacityProblems";
import type { ResolvedUnitSelection } from "@/features/workspace/unitSelection";

/**
 * How many people hold each job title of the units shown, read live from the
 * job titles list (`job_title:read`), so the capacity check never waits on a
 * generated roster. None until it answers, or where job titles may not be read.
 */
export const useJobTitleHolders = (
	companyId: string,
	units: ResolvedUnitSelection
): HoldersByJobTitle | undefined => {
	const jobTitles = useJobTitles(companyId, {
		sort: { field: "name", desc: false },
		branchId: units.branch?.branchId,
		departmentId: units.department?.departmentId,
	});
	if (jobTitles.status !== "ready") return undefined;
	return new Map(
		jobTitles.items.map((jobTitle) => [
			jobTitle.jobTitleId,
			jobTitle.holderCount,
		])
	);
};
