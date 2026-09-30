import type { CurrentUser, Membership } from "@/features/auth/api";

/** A preference only: the API still checks access on every bearer request. */
export const CURRENT_COMPANY_KEY = "horaion.currentCompanyId";
export type CurrentCompany =
	| { kind: "settled"; company: Membership }
	| { kind: "choose"; companies: Array<Membership> }
	| { kind: "none" };

export const usableCompanies = (user: CurrentUser): Array<Membership> =>
	user.memberships.filter(
		(company) =>
			company.status === "ACTIVE" && company.companyStatus === "ACTIVE"
	);

const rememberedCompany = (): string | null => {
	try {
		return window.localStorage.getItem(CURRENT_COMPANY_KEY);
	} catch {
		return null;
	}
};

export const rememberCompany = (companyId: string): void => {
	try {
		window.localStorage.setItem(CURRENT_COMPANY_KEY, companyId);
	} catch {
		// The route's query cache keeps the choice for this Session instead.
	}
};

export const settleCurrentCompany = (
	user: CurrentUser,
	chosenId: string | null = rememberedCompany()
): CurrentCompany => {
	const companies = usableCompanies(user);
	const company =
		companies.find((item) => item.companyId === chosenId) ??
		(companies.length === 1 ? companies[0] : undefined);
	if (company) return { kind: "settled", company };
	return companies.length === 0
		? { kind: "none" }
		: { kind: "choose", companies };
};
