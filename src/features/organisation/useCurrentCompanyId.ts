import { useRouteContext } from "@tanstack/react-router";

/**
 * The settled current company's id. Organisation pages render inside the
 * authenticated layout, which shows them only once a company is settled.
 */
export const useCurrentCompanyId = (): string => {
	const context = useRouteContext({ from: "/_authenticated" });
	return "currentCompany" in context &&
		context.currentCompany.kind === "settled"
		? context.currentCompany.company.companyId
		: "";
};
