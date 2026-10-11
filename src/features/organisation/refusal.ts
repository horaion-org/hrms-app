import { ApiProblemError } from "@/common/problem";

/**
 * 403 codes that are business rules rather than missing authority: holding
 * more roles, or reloading them, cannot fix them, so they are never
 * explained as "you don't have permission". Each caller names its own copy
 * for them in `alerts`; without one they read as a plain failure.
 */
export const BUSINESS_RULE_REFUSALS: ReadonlySet<string> = new Set([
	"OWN_LEAVE_REVIEW_DENIED",
]);

/** Where a refused create lands: field errors, a form alert, or both. */
export type Refusal<F extends string> = {
	fields: Partial<Record<F, string>>;
	message?: string;
	/** Set when the chosen people may be stale and their options should reload. */
	refreshMembers: boolean;
};

export type RefusalRules<F extends string> = {
	/** Known refusals keyed by `"<status> <errorCode>"`, each placed on one field. */
	codes?: Partial<
		Record<string, { field: F; message: string; refreshMembers?: boolean }>
	>;
	/** Known refusals keyed by `"<status> <errorCode>"`, shown as the form alert. */
	alerts?: Partial<Record<string, string>>;
	/** A 400's `errors[].field` mapped to a form field and its copy. */
	fieldErrors?: Partial<Record<string, { field: F; message: string }>>;
	/** Any other 403 that is about authority (see `BUSINESS_RULE_REFUSALS`). */
	forbidden: string;
	/** Everything else, including network failures. */
	failed: string;
};

/**
 * Maps a failed create to frontend-owned copy. Server codes only select copy;
 * untrusted server prose is never displayed.
 */
export const mapRefusal = <F extends string>(
	error: unknown,
	rules: RefusalRules<F>
): Refusal<F> => {
	if (error instanceof ApiProblemError) {
		const key = `${error.status} ${error.errorCode ?? ""}`;
		const coded = rules.codes?.[key];
		if (coded)
			return {
				fields: { [coded.field]: coded.message } as Partial<Record<F, string>>,
				refreshMembers: coded.refreshMembers ?? false,
			};
		const alert = rules.alerts?.[key];
		if (alert) return { fields: {}, message: alert, refreshMembers: false };
		if (error.status === 400) {
			const fields: Partial<Record<F, string>> = {};
			for (const { field } of error.fieldErrors) {
				const mapped = rules.fieldErrors?.[field];
				if (mapped) fields[mapped.field] = mapped.message;
			}
			if (Object.keys(fields).length > 0)
				return { fields, refreshMembers: false };
		}
		if (
			error.status === 403 &&
			!BUSINESS_RULE_REFUSALS.has(error.errorCode ?? "")
		)
			return { fields: {}, message: rules.forbidden, refreshMembers: false };
	}
	return { fields: {}, message: rules.failed, refreshMembers: false };
};
