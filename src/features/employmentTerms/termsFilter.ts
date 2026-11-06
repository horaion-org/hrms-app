import type { EmploymentTerms } from "@/features/employmentTerms/api";

/** One terms the People filter offers. */
export type TermsChoice = { id: string; name: string; inactive: boolean };

/**
 * The terms the People filter offers: every active terms, and the chosen
 * one even when it is inactive (a Settings link can name terms that are no
 * longer given out but are still held), in the catalogue's order.
 */
export const termsChoices = (
	terms: ReadonlyArray<EmploymentTerms>,
	chosenId: string | undefined
): Array<TermsChoice> =>
	terms
		.filter((each) => each.status === "ACTIVE" || each.id === chosenId)
		.map(({ id, name, status }) => ({
			id,
			name,
			inactive: status !== "ACTIVE",
		}));

/** The chosen terms' name for its chip, or undefined while unknown. */
export const chosenTermsName = (
	terms: ReadonlyArray<EmploymentTerms> | undefined,
	chosenId: string
): string | undefined => terms?.find((each) => each.id === chosenId)?.name;
