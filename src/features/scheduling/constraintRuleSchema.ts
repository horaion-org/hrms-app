import type { TFunction } from "i18next";
import { z } from "zod";
import {
	CONSTRAINT_TYPES,
	RULE_CONDITIONS,
	RULE_REQUIREMENTS,
	type ConstraintRule,
	type ConstraintType,
} from "@/features/scheduling/scheduleDraft";

export const HEADCOUNT_MIN = 1;
export const HEADCOUNT_MAX = 999;

/** Add Constraint's fields as typed; an unchosen select is "". */
export type ConstraintRuleValues = {
	type: ConstraintType;
	requirement: string;
	condition: string;
	headcount: string;
	roleIds: Array<string>;
	shiftIds: Array<string>;
};

const key = "scheduling.constraints.dialog.validation";

export const constraintRuleSchema = (
	t: TFunction
): z.ZodType<ConstraintRule, ConstraintRuleValues> => {
	const headcount = t(`${key}.headcount`, {
		min: HEADCOUNT_MIN,
		max: HEADCOUNT_MAX,
	});
	return z.object({
		type: z.enum(CONSTRAINT_TYPES),
		requirement: z
			.string()
			.pipe(z.enum(RULE_REQUIREMENTS, { error: t(`${key}.requirement`) })),
		condition: z
			.string()
			.pipe(z.enum(RULE_CONDITIONS, { error: t(`${key}.condition`) })),
		headcount: z
			.string()
			.trim()
			.regex(/^\d+$/, headcount)
			.transform(Number)
			.pipe(
				z.number().min(HEADCOUNT_MIN, headcount).max(HEADCOUNT_MAX, headcount)
			),
		roleIds: z.array(z.string()).min(1, t(`${key}.roles`)),
		shiftIds: z.array(z.string()).min(1, t(`${key}.shifts`)),
	});
};
