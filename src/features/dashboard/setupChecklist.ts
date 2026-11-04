/** What the "Set up your company" card is ticked from: active units and members. */
export type SetupCounts = {
	branches: number;
	departments: number;
	jobTitles: number;
	members: number;
};

export type SetupProgress = {
	/** At least one branch, one department and one job title exist. */
	organisationDone: boolean;
	/** Someone besides the founder is a member. */
	peopleDone: boolean;
	/** How many of the two steps are done. */
	doneCount: number;
	/** Both steps are done: the card has nothing left to suggest. */
	complete: boolean;
};

export const SETUP_STEP_COUNT = 2;

export const setupProgress = (counts: SetupCounts): SetupProgress => {
	const organisationDone =
		counts.branches > 0 && counts.departments > 0 && counts.jobTitles > 0;
	const peopleDone = counts.members > 1;
	const doneCount = Number(organisationDone) + Number(peopleDone);
	return {
		organisationDone,
		peopleDone,
		doneCount,
		complete: doneCount === SETUP_STEP_COUNT,
	};
};

/**
 * The browser-storage key that remembers the card was dismissed, per
 * company. It holds only "true"; no personal data.
 */
export const setupDismissedKey = (companyId: string): string =>
	`horaion.setupChecklistDismissed.${companyId}`;

/** Whether this browser dismissed the card for the company; storage that fails reads as not dismissed. */
export const isSetupDismissed = (
	companyId: string,
	storage?: Pick<Storage, "getItem">
): boolean => {
	try {
		// Reading `window.localStorage` itself throws where storage is blocked.
		const store = storage ?? window.localStorage;
		return store.getItem(setupDismissedKey(companyId)) === "true";
	} catch {
		return false;
	}
};

/** Remembers the dismissal; when storage fails, the card stays hidden for this visit only. */
export const rememberSetupDismissed = (
	companyId: string,
	storage?: Pick<Storage, "setItem">
): void => {
	try {
		const store = storage ?? window.localStorage;
		store.setItem(setupDismissedKey(companyId), "true");
	} catch {
		// The page's own state hides the card until the next visit.
	}
};
