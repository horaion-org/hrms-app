import { skipToken, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
	fetchActiveBranchCount,
	fetchActiveDepartmentCount,
	fetchActiveJobTitleCount,
	organisationKeys,
} from "@/features/organisation/api";
import { fetchActiveMemberCount } from "@/features/people/api";
import {
	isSetupDismissed,
	rememberSetupDismissed,
	setupProgress,
	type SetupCounts,
	type SetupProgress,
} from "@/features/dashboard/setupChecklist";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

export type SetupChecklist =
	| { status: "hidden" }
	| {
			status: "shown";
			counts: SetupCounts;
			progress: SetupProgress;
			canImportOrganisation: boolean;
			canImportPeople: boolean;
			dismiss: () => void;
	  };

/** A count the workspace lets the person read, or nothing asked for. */
const useCount = (
	queryKey: ReadonlyArray<string>,
	companyId: string,
	allowed: boolean,
	fetchCount: (companyId: string) => Promise<number>
): number | undefined =>
	useQuery({
		queryKey,
		retry,
		meta: administrativeMeta(companyId),
		queryFn: allowed ? (): Promise<number> => fetchCount(companyId) : skipToken,
	}).data;

/**
 * The "Set up your company" card's state: shown to someone who can import
 * the organisation or people, ticked from the counts they can read, and
 * hidden once both steps are done, when a count is unknown, or after they
 * dismiss it in this browser.
 */
export const useSetupChecklist = (companyId: string): SetupChecklist => {
	const access = useAccess();
	// The company dismissed during this visit; storage remembers it for later visits.
	const [dismissedNow, setDismissedNow] = useState<string | undefined>();
	const dismissed = dismissedNow === companyId || isSetupDismissed(companyId);
	const canImportOrganisation = access.can("branch:create", COMPANY_SCOPE);
	const canImportPeople = access.canAnywhere("member_profile:create");
	const wanted = !dismissed && (canImportOrganisation || canImportPeople);
	// The same entries as the Organisation overview's figures, so both share one fetch.
	const branches = useCount(
		organisationKeys.activeBranchCount(companyId),
		companyId,
		wanted && access.canAnywhere("branch:read"),
		fetchActiveBranchCount
	);
	const departments = useCount(
		organisationKeys.activeDepartmentCount(companyId),
		companyId,
		wanted && access.canAnywhere("department:read"),
		fetchActiveDepartmentCount
	);
	const jobTitles = useCount(
		organisationKeys.activeJobTitleCount(companyId),
		companyId,
		wanted && access.canAnywhere("job_title:read"),
		fetchActiveJobTitleCount
	);
	const members = useCount(
		["people", companyId, "active-member-count"],
		companyId,
		wanted && access.canAnywhere("member_profile:read"),
		fetchActiveMemberCount
	);

	if (
		!wanted ||
		branches === undefined ||
		departments === undefined ||
		jobTitles === undefined ||
		members === undefined
	)
		return { status: "hidden" };
	const counts = { branches, departments, jobTitles, members };
	const progress = setupProgress(counts);
	if (progress.complete) return { status: "hidden" };
	return {
		status: "shown",
		counts,
		progress,
		canImportOrganisation,
		canImportPeople,
		dismiss: (): void => {
			rememberSetupDismissed(companyId);
			setDismissedNow(companyId);
		},
	};
};
