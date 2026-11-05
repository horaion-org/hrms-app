import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import {
	changeTermsStatus,
	createTerms,
	deleteTerms,
	makeDefaultTerms,
	changeTermsFromDate,
	correctTerms,
	reloadTermsReads,
	type EmploymentTerms,
	type EmploymentTermsBody,
	type TermsChange,
} from "@/features/employmentTerms/api";
import type { IsoDate } from "@/components/forms/Calendar";

type Corrected = {
	termsId: string;
	body: EmploymentTermsBody;
	/** Counts every holder's hours again under the new week. */
	correctForEveryone?: boolean;
};
type ChangedFromDate = {
	termsId: string;
	startsOn: IsoDate;
	newTerms: EmploymentTermsBody;
	previousTermsName?: string;
};
type StatusChange = { termsId: string; status: "ACTIVE" | "INACTIVE" };

export type EmploymentTermsActions = {
	create: UseMutationResult<EmploymentTerms, Error, EmploymentTermsBody>;
	correct: UseMutationResult<EmploymentTerms, Error, Corrected>;
	changeFromDate: UseMutationResult<TermsChange, Error, ChangedFromDate>;
	changeStatus: UseMutationResult<EmploymentTerms, Error, StatusChange>;
	makeDefault: UseMutationResult<EmploymentTerms, Error, string>;
	remove: UseMutationResult<void, Error, string>;
};

/**
 * Adding, correcting, changing from a date, deactivating, defaulting and
 * deleting the company's employment terms. Every change can move what
 * people's terms read as, so each success reloads what depends on them.
 */
export const useEmploymentTermsActions = (
	companyId: string
): EmploymentTermsActions => {
	const client = useQueryClient();
	const reload = (): Promise<void> => reloadTermsReads(client, companyId);
	return {
		create: useMutation({
			meta: { successMessage: false },
			mutationFn: (body: EmploymentTermsBody) => createTerms(companyId, body),
			onSuccess: reload,
		}),
		correct: useMutation({
			meta: { successMessage: false },
			mutationFn: ({ termsId, body, correctForEveryone }: Corrected) =>
				correctTerms(companyId, termsId, body, correctForEveryone),
			onSuccess: reload,
		}),
		changeFromDate: useMutation({
			meta: { successMessage: false },
			mutationFn: ({ termsId, ...change }: ChangedFromDate) =>
				changeTermsFromDate(companyId, termsId, change),
			onSuccess: reload,
		}),
		changeStatus: useMutation({
			meta: { successMessage: false },
			mutationFn: ({ termsId, status }: StatusChange) =>
				changeTermsStatus(companyId, termsId, status),
			onSuccess: reload,
		}),
		makeDefault: useMutation({
			meta: { successMessage: false },
			mutationFn: (termsId: string) => makeDefaultTerms(companyId, termsId),
			onSuccess: reload,
		}),
		remove: useMutation({
			meta: { successMessage: false },
			mutationFn: (termsId: string) => deleteTerms(companyId, termsId),
			onSuccess: reload,
		}),
	};
};
