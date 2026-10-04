import type { TFunction } from "i18next";
import { ApiProblemError } from "@/common/problem";

export type Refusal = {
	fields: { name?: string; heads?: string };
	message?: string;
	refreshMembers: boolean;
};

/** Server codes select frontend-owned copy; untrusted server prose is never displayed. */
export const refusalFor = (
	error: unknown,
	name: string,
	t: TFunction
): Refusal => {
	const key = "organisation.branches.createDialog";
	if (error instanceof ApiProblemError) {
		if (error.status === 409 && error.errorCode === "BRANCH_NAME_CONFLICT")
			return {
				fields: { name: t(`${key}.nameConflict`, { name }) },
				refreshMembers: false,
			};
		if (
			error.status === 400 &&
			error.errorCode === "INVALID_INITIAL_BRANCH_HEAD"
		)
			return {
				fields: { heads: t(`${key}.headsUnavailable`) },
				refreshMembers: true,
			};
		if (error.status === 400) {
			const fields: Refusal["fields"] = {};
			for (const { field } of error.fieldErrors) {
				if (field === "name") fields.name = t(`${key}.nameRejected`);
				if (field === "initialHeadCompanyMembershipIds")
					fields.heads = t(`${key}.headsRejected`);
			}
			if (fields.name || fields.heads) return { fields, refreshMembers: false };
		}
		if (error.status === 403)
			return {
				fields: {},
				message: t(`${key}.forbidden`),
				refreshMembers: false,
			};
	}
	return { fields: {}, message: t(`${key}.failed`), refreshMembers: false };
};
