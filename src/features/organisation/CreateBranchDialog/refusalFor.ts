import type { TFunction } from "i18next";
import { ApiProblemError } from "@/common/problem";

export type Refusal = {
	fields: { name?: string; code?: string; heads?: string };
	message?: string;
	refreshMembers: boolean;
};

/** Server codes select frontend-owned copy; untrusted server prose is never displayed. */
export const refusalFor = (
	error: unknown,
	{ name, code }: { name: string; code: string },
	t: TFunction
): Refusal => {
	const key = "organisation.branches.createDialog";
	if (error instanceof ApiProblemError) {
		if (error.status === 409 && error.errorCode === "BRANCH_NAME_CONFLICT")
			return {
				fields: { name: t(`${key}.nameConflict`, { name }) },
				refreshMembers: false,
			};
		if (error.status === 409 && error.errorCode === "BRANCH_CODE_CONFLICT")
			return {
				fields: { code: t(`${key}.codeConflict`, { code }) },
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
				if (field === "code") fields.code = t(`${key}.codeRejected`);
				if (field === "initialHeadCompanyMembershipIds")
					fields.heads = t(`${key}.headsRejected`);
			}
			if (fields.name || fields.code || fields.heads)
				return { fields, refreshMembers: false };
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
