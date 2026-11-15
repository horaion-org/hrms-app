import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	needsAttention,
	problemLines,
} from "@/features/scheduling/constraints/valueProblems";

const t = authTestI18n.t;

describe("valueProblems", () => {
	it("words each value that no longer fits, and only those", () => {
		const values = [
			{ value: "closing", name: "Closing", problem: "UNAVAILABLE" as const },
			{ value: "lead", name: "Lead", problem: "NOT_LISTED" as const },
			{ value: "late", name: "Late", problem: "LISTS_NONE" as const },
			{ value: "x", name: null, problem: "UNKNOWN" as const },
			{ value: "clerk", name: "Clerk", problem: null },
		];

		expect(needsAttention(values)).toBe(true);
		expect(problemLines(values, t)).toEqual([
			"Closing no longer exists or isn’t active. Edit the constraint or delete it.",
			"Lead isn’t on the constraint’s shifts any more. Edit the constraint, or add Lead to the shift.",
			"Late lists none of the constraint’s job titles any more. Edit the constraint, or add one to the shift.",
			"x no longer fits. Edit the constraint.",
		]);
	});

	it("finds nothing on a healthy rule or a frozen copy", () => {
		const values = [{ value: "clerk", name: "Clerk", problem: null }];

		expect(needsAttention(values)).toBe(false);
		expect(problemLines(values, t)).toEqual([]);
		expect(needsAttention([{ value: "1", name: null }])).toBe(false);
	});
});
