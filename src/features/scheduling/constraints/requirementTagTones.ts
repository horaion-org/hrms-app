import type { BadgeTone } from "@/components/ui/Badge";
import {
	CONSTRAINT_REQUIREMENTS,
	type ConstraintRequirement,
} from "@/features/scheduling/constraints/api";

/*
 * The colour of a rule's Must or If possible tag. Every tag shows through
 * ConstraintStatement (the constraint lists, the work policy, a week's
 * choice of rules, the dialog's preview), so changing a colour is a
 * one-line edit here. The tag keeps its words, so it reads without colour.
 */

/** The badge tone of each requirement: Must as every tag looked before, If possible in amber. */
export const REQUIREMENT_TAG_TONES: Record<ConstraintRequirement, BadgeTone> = {
	MUST: "neutral",
	SHOULD: "warning",
};

/** The tone of a requirement's tag; neutral for none chosen yet, or one this build does not know. */
export const requirementTagTone = (requirement: string | null): BadgeTone => {
	const known = CONSTRAINT_REQUIREMENTS.find(
		(choice) => choice === requirement
	);
	return known ? REQUIREMENT_TAG_TONES[known] : "neutral";
};
