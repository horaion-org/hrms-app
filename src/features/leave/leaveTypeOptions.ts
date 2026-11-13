import type { TFunction } from "i18next";
import type { SelectOption } from "@/components/forms/Select";
import type { CompanyLeaveType } from "@/features/leave/api";

/** The kinds the app groups by, in the order their groups are listed. */
const GRANT_KINDS = ["ALLOWANCE", "PER_OCCASION", "UNTRACKED"] as const;

type GrantKind = (typeof GRANT_KINDS)[number];

const isGrantKind = (kind: string): kind is GrantKind =>
	(GRANT_KINDS as ReadonlyArray<string>).includes(kind);

/** Known kinds first in their fixed order; a kind this app does not know goes last. */
const kindRank = (kind: string): number =>
	isGrantKind(kind) ? GRANT_KINDS.indexOf(kind) : GRANT_KINDS.length;

/** A type a person can choose when applying: active, and not the scheduler's own. */
export const isApplicableLeaveType = (type: CompanyLeaveType): boolean =>
	type.status === "ACTIVE" && !type.system;

/**
 * The leave types a person can apply for, as Select options valued by code,
 * grouped under their kind's heading in the company's order. With a single
 * kind there is nothing to tell apart, so no heading is shown; a kind the
 * app does not know is listed last without one.
 */
export const leaveTypeOptions = (
	types: ReadonlyArray<CompanyLeaveType>,
	t: TFunction
): Array<SelectOption> => {
	const applicable = types
		.filter(isApplicableLeaveType)
		.sort(
			(first, second) =>
				kindRank(first.grantKind) - kindRank(second.grantKind) ||
				first.displayOrder - second.displayOrder
		);
	const grouped = new Set(applicable.map((type) => type.grantKind)).size > 1;
	return applicable.map((type) => ({
		value: type.code,
		label: type.name,
		...(grouped && isGrantKind(type.grantKind)
			? { group: t(`leave.grantKinds.${type.grantKind}`) }
			: {}),
	}));
};

/**
 * The options for changing a request's type: the types that apply to its
 * member now, with the request's own type first when it no longer applies,
 * so keeping it is always possible (the API accepts an unchanged type).
 */
export const withCurrentType = (
	options: Array<SelectOption>,
	current: { code: string; name: string }
): Array<SelectOption> =>
	options.some((option) => option.value === current.code)
		? options
		: [{ value: current.code, label: current.name }, ...options];
