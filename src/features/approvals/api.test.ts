import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	LEAVE_REQUEST,
	SCHEDULE_PUBLICATION,
	searchEligibleApprovers,
} from "@/features/approvals/api";

const ELIGIBLE = "GET /api/v1/companies/c-1/approval-flows/eligible-approvers";

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
});

describe("eligible approver search", () => {
	it("asks for the subject, the department and a trimmed search, twenty by name, and parses the page", async () => {
		const member = {
			membershipId: "m-3",
			displayName: "Siti Rahman",
			status: "ACTIVE",
		};
		const calls = stubApi({
			[ELIGIBLE]: {
				status: 200,
				body: envelope({ content: [member], page: { totalElements: 25 } }),
			},
		});

		await expect(
			searchEligibleApprovers("c-1", {
				subjectType: LEAVE_REQUEST,
				departmentId: "d-1",
				search: "  Siti  ",
			})
		).resolves.toEqual({ items: [member], total: 25 });
		expect(Object.fromEntries(new URLSearchParams(calls[0]?.search))).toEqual({
			subjectType: "LEAVE_REQUEST",
			departmentId: "d-1",
			search: "Siti",
			size: "20",
			sort: "user.displayName",
		});
	});

	it("sends no department for the company default and no blank search", async () => {
		const calls = stubApi({
			[ELIGIBLE]: {
				status: 200,
				body: envelope({ content: [], page: { totalElements: 0 } }),
			},
		});

		await searchEligibleApprovers("c-1", {
			subjectType: SCHEDULE_PUBLICATION,
			departmentId: "",
			search: "  ",
		});

		expect(Object.fromEntries(new URLSearchParams(calls[0]?.search))).toEqual({
			subjectType: "SCHEDULE_PUBLICATION",
			size: "20",
			sort: "user.displayName",
		});
	});
});
