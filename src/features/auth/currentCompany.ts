import type {
	CompanyStatus,
	CurrentUser,
	Membership,
} from "@/features/auth/api";

/**
 * Where the last Company chosen is remembered. It is only a preference, not a
 * credential: the API checks the Membership on every request.
 */
export const CURRENT_COMPANY_KEY = "horaion.currentCompanyId";

/** Company states the API still lets a member work in. */
const USABLE_COMPANY_STATUSES: ReadonlySet<CompanyStatus> =
	new Set<CompanyStatus>(["ACTIVE", "PENDING_VERIFICATION"]);

/**
 * How the Current Company settled for a signed-in person: a Company to work
 * in, several to choose from, or none at all.
 */
export type CurrentCompany =
	| { status: "settled"; company: Membership }
	| { status: "choosing"; companies: Array<Membership> }
	| { status: "none" };

/** The Memberships that still grant access to a usable Company. */
export const activeMemberships = (user: CurrentUser): Array<Membership> =>
	user.memberships.filter(
		(membership) =>
			membership.status === "ACTIVE" &&
			USABLE_COMPANY_STATUSES.has(membership.companyStatus)
	);

const readRemembered = (): string | null => {
	try {
		return window.localStorage.getItem(CURRENT_COMPANY_KEY);
	} catch {
		return null;
	}
};

/** Remembers `companyId` as the Current Company for the next visit. */
export const chooseCompany = (companyId: string): void => {
	try {
		window.localStorage.setItem(CURRENT_COMPANY_KEY, companyId);
	} catch {
		// Storage can be unavailable (private mode, blocked site data); the
		// choice then lasts only until the next load asks again.
	}
};

/**
 * Settles the Current Company: the one chosen last if it is still among the
 * active Memberships; otherwise the only one; otherwise the person chooses.
 */
export const settleCurrentCompany = (user: CurrentUser): CurrentCompany => {
	const companies = activeMemberships(user);
	const remembered = readRemembered();
	const chosen =
		companies.find((membership) => membership.companyId === remembered) ??
		(companies.length === 1 ? companies[0] : undefined);

	if (chosen !== undefined) {
		if (chosen.companyId !== remembered) {
			chooseCompany(chosen.companyId);
		}

		return { status: "settled", company: chosen };
	}

	return companies.length === 0
		? { status: "none" }
		: { status: "choosing", companies };
};
