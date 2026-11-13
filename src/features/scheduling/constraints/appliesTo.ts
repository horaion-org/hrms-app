import type { TFunction } from "i18next";
import type {
	ConstraintType,
	PolicyLevel,
} from "@/features/scheduling/constraints/api";
import type { SentenceValue } from "@/features/scheduling/constraints/constraintSentence";
import {
	reachLabel,
	type ReachedBranch,
	type ReachedDepartment,
} from "@/features/workspace/unitReach";

/** What the line under a constraint's sentence is built from. */
export type AppliesToSource = {
	type: ConstraintType;
	level: PolicyLevel;
	/** The department a department constraint belongs to; absent where the list does not name it. */
	departmentName?: string | null;
	values: ReadonlyArray<Pick<SentenceValue, "field" | "name">>;
	/** Where a work-policy constraint applies (ADR-0072); none, or absent, is the whole company. */
	appliesToBranches?: Array<ReachedBranch>;
	appliesToDepartments?: Array<ReachedDepartment>;
};

/** The types counted on chosen shifts; every other type applies to everyone rostered. */
const SHIFT_TYPES: ReadonlyArray<ConstraintType> = [
	"SHIFT_STAFFING",
	"SHIFT_STAFFING_WITH_STAND_INS",
	"ROLE_PRESENCE",
];

/**
 * Who a constraint applies to, as the muted line under its sentence: for a
 * work-policy constraint "Whole company" or where it reaches ("Orchard
 * (branch)", "Bar, Kitchen"), the chosen shifts for a shift type, and
 * "Everyone rostered in Sales" for any other; nothing when there is nothing
 * to name yet.
 */
export const appliesToOf = (
	source: AppliesToSource,
	t: TFunction
): string | undefined => {
	if (source.level === "COMPANY") {
		const reach = {
			appliesToBranches: source.appliesToBranches ?? [],
			appliesToDepartments: source.appliesToDepartments ?? [],
		};
		return reach.appliesToBranches.length + reach.appliesToDepartments.length >
			0
			? reachLabel(reach, t)
			: t("scheduling.constraints.appliesTo.wholeCompany");
	}
	if (SHIFT_TYPES.includes(source.type)) {
		const shifts = source.values
			.filter((value) => value.field === "SHIFT" && value.name !== null)
			.map((value) => value.name);
		return shifts.length > 0
			? t("scheduling.constraints.list", { items: shifts })
			: undefined;
	}
	return source.departmentName
		? t("scheduling.constraints.appliesTo.everyoneIn", {
				department: source.departmentName,
			})
		: undefined;
};
