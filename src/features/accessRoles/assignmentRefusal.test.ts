import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	assignmentRefusal,
	assignmentStatusRefusal,
} from "@/features/accessRoles/assignmentRefusal";

const t = authTestI18n.t.bind(authTestI18n);
const problem = (status: number, errorCode: string): ApiProblemError =>
	new ApiProblemError({
		status,
		errorCode,
		fieldErrors: [],
		reason: "http",
		message: "Private server wording",
	});

describe("assignment refusal mapping", () => {
	it("explains a company role given at a branch or department in its own words", () => {
		expect(
			assignmentRefusal(problem(400, "ACCESS_ROLE_KIND_CONFLICT"), t)
		).toBe("A company role can only be given at the whole company.");
	});

	it("keeps the other assignment refusals as they were", () => {
		expect(
			assignmentRefusal(problem(400, "INVALID_ACCESS_ROLE_ASSIGNMENT"), t)
		).toBe(
			"This role can’t be given to this person at one of those places. They may no longer be an active member, or the role may not fit that place."
		);
		expect(
			assignmentRefusal(problem(409, "ACCESS_ROLE_ASSIGNMENT_CONFLICT"), t)
		).toBe("This person already has the role at one of those places.");
	});

	it("explains switching a company role back on at a branch or department in its own words", () => {
		expect(
			assignmentStatusRefusal(problem(400, "ACCESS_ROLE_KIND_CONFLICT"), t)
		).toBe(
			"A company role can only be active at the whole company. Remove it from this place instead."
		);
	});
});
