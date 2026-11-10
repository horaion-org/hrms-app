import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { companyWideWorkspace } from "@/common/testing/effectiveWorkspace";
import { envelope, problemReply, stubApi } from "@/common/testing/stubApi";
import type { FunctionComponent } from "@/common/types";
import { leaveAtHrInstanceFixture } from "@/features/approvals/fixtures";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	LEAVE_FIXTURES,
	leaveAtStepFixture,
	leaveFixture,
} from "@/features/leave/fixtures";
import { useLeaveDecision } from "@/features/leave/useLeaveDecision";
import { workspaceQuery } from "@/features/workspace/api";

// The hook reads the signed-in member from the route context; this test has no router.
vi.mock("@/features/workspace/useCurrentCompany", () => ({
	useCurrentCompanyId: (): string => "c-1",
	useCurrentMembershipId: (): string => "m-owner",
}));

const COMPANY = "/api/v1/companies/c-1";
const PENDING_APPROVALS = `GET ${COMPANY}/me/approval-instances/pending`;
const cheryl = LEAVE_FIXTURES[1]!;
const CHERYL = `${COMPANY}/member-profiles/m-cheryl/leave-requests/${cheryl.leaveRequestId}`;

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

/** The hook for a reviewer holding `leave_request:review` company-wide, and what it told them. */
const setUp = (): {
	decision: () => ReturnType<typeof useLeaveDecision>;
	onDecided: ReturnType<typeof vi.fn<(message: string) => void>>;
} => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	client.setQueryData(
		workspaceQuery.queryKey,
		companyWideWorkspace(["leave_request:review"])
	);
	const wrapper = ({
		children,
	}: {
		children: ReactNode;
	}): FunctionComponent => (
		<QueryClientProvider client={client}>
			<I18nextProvider i18n={authTestI18n}>{children}</I18nextProvider>
		</QueryClientProvider>
	);
	const onDecided = vi.fn<(message: string) => void>();
	const { result } = renderHook(() => useLeaveDecision("c-1", { onDecided }), {
		wrapper,
	});
	return { decision: () => result.current, onDecided };
};

it("approves a request without a flow in one review and says so", async () => {
	const calls = stubApi({
		[PENDING_APPROVALS]: { status: 200, body: envelope([]) },
		[`POST ${CHERYL}/approval`]: { status: 200, body: envelope(cheryl) },
	});
	const { decision, onDecided } = setUp();
	const review = decision().reviewOf(cheryl);
	expect(review.canReview).toBe(true);

	act(() => {
		review.onApprove(cheryl, "", false);
	});

	await waitFor(() => {
		expect(onDecided).toHaveBeenCalledWith("Request for Cheryl Ng approved.");
	});
	expect(calls.map((call) => `${call.method} ${call.path}`)).toContain(
		`POST ${CHERYL}/approval`
	);
});

it("decides a request under a flow on its open step", async () => {
	const atManager = leaveAtStepFixture(1);
	const calls = stubApi({
		[PENDING_APPROVALS]: { status: 200, body: envelope([]) },
		[`POST ${COMPANY}/approval-instances/ai-leave/decisions`]: {
			status: 200,
			body: envelope(leaveAtHrInstanceFixture()),
		},
	});
	const { decision, onDecided } = setUp();

	act(() => {
		decision().reviewOf(atManager).onReject(atManager, "Short-staffed");
	});

	await waitFor(() => {
		expect(onDecided).toHaveBeenCalledWith(
			"Request for Aisha Rahman rejected."
		);
	});
	expect(calls.find((call) => call.path.endsWith("/decisions"))?.body).toEqual({
		stepOrder: 1,
		decision: "REJECT",
		comment: "Short-staffed",
	});
});

it("keeps a refused reason on its field until the dialog clears it", async () => {
	stubApi({
		[PENDING_APPROVALS]: { status: 200, body: envelope([]) },
		[`POST ${CHERYL}/rejection`]: problemReply(400, "INVALID_REJECTION_REASON"),
	});
	const { decision, onDecided } = setUp();

	act(() => {
		decision().reviewOf(cheryl).onReject(cheryl, "x");
	});

	await waitFor(() => {
		expect(decision().reviewOf(cheryl).refusal?.fields.reason).toBeDefined();
	});
	expect(onDecided).not.toHaveBeenCalled();
	act(() => {
		decision().clearRefusal();
	});
	expect(decision().reviewOf(cheryl).refusal).toBeUndefined();
});

it("offers no decision on the reviewer's own request", () => {
	stubApi({ [PENDING_APPROVALS]: { status: 200, body: envelope([]) } });
	const { decision } = setUp();
	const own = leaveFixture({
		leaveRequestId: "leave-own",
		membershipId: "m-owner",
	});

	expect(decision().canDecide(own)).toBe(false);
	expect(decision().reviewOf(own).canReview).toBe(false);
});
