import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, problemReply, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import { leaveFixture } from "@/features/leave/fixtures";
import type { LeaveRequest } from "@/features/leave/types";
import {
	LeaveRequestLifecycle,
	type LeaveRequestLifecycleProps,
} from "./LeaveRequestLifecycle";

const MEMBER = "/api/v1/companies/c-1/member-profiles/m-aisha/leave-requests";
const OWN = "/api/v1/companies/c-1/me/leave-requests";
const LEAVE_TYPES = "GET /api/v1/companies/c-1/me/leave-types";
const approved = leaveFixture({
	leaveRequestId: "leave-1",
	status: "APPROVED",
	startDate: "2026-06-01",
	endDate: "2026-06-05",
});
const pending = leaveFixture({ leaveRequestId: "leave-1" });
const line = {
	kind: "CHANGED",
	affectedDay: null,
	beforeLeaveTypeName: "Annual leave",
	afterLeaveTypeName: "Annual leave",
	beforeStartDate: "2026-06-01",
	beforeEndDate: "2026-06-05",
	afterStartDate: "2026-06-01",
	afterEndDate: "2026-06-05",
	remark: null,
	changedByMembershipId: "m-sam",
	changedByName: "Sam Tan",
	changedAt: "2026-05-20T08:00:00Z",
};

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

const show = (
	request: LeaveRequest,
	props: Partial<LeaveRequestLifecycleProps> = {}
): void => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				<LeaveRequestLifecycle
					canChange={false}
					companyId="c-1"
					own={false}
					request={request}
					onDone={vi.fn()}
					{...props}
				/>
			</QueryClientProvider>
		</I18nextProvider>
	);
};

describe("LeaveRequestLifecycle", () => {
	it("given_noHistoryAndNothingToDo_when_shown_then_showsNothing", async () => {
		const calls = stubApi({
			[`GET ${MEMBER}/leave-1/changes`]: { status: 200, body: envelope([]) },
		});
		show(approved);
		await waitFor(() => {
			expect(calls).toHaveLength(1);
		});
		expect(screen.queryByText("History")).not.toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("given_movedDates_when_shown_then_theHistoryShowsThemBeforeAndAfter", async () => {
		stubApi({
			[`GET ${MEMBER}/leave-1/changes`]: {
				status: 200,
				body: envelope([
					{ ...line, afterEndDate: "2026-06-03", remark: "Back early" },
				]),
			},
		});
		show(approved);
		expect(await screen.findByText(/Changed by Sam Tan/)).toBeInTheDocument();
		expect(screen.getByText(/→/)).toHaveTextContent("Jun");
		expect(screen.getByText("Back early")).toBeInTheDocument();
	});

	it("given_aTypeChange_when_shown_then_theHistoryShowsTheTypesAndNoDates", async () => {
		stubApi({
			[`GET ${MEMBER}/leave-1/changes`]: {
				status: 200,
				body: envelope([{ ...line, afterLeaveTypeName: "Unpaid leave" }]),
			},
		});
		show(approved);
		expect(
			await screen.findByText("Annual leave → Unpaid leave")
		).toBeInTheDocument();
		expect(screen.getAllByText(/→/)).toHaveLength(1);
	});

	it("given_aChangeLateInTheEvening_when_shown_then_itReadsAsTheLocalDay", async () => {
		const lateEvening = new Date(2026, 4, 20, 23, 30);
		stubApi({
			[`GET ${MEMBER}/leave-1/changes`]: {
				status: 200,
				body: envelope([{ ...line, changedAt: lateEvening.toISOString() }]),
			},
		});
		show(approved);
		expect(await screen.findByText(/May 20, 2026/)).toBeInTheDocument();
	});

	it("given_ownPendingRequest_when_withdrawn_then_callsTheMeRouteAndSaysSo", async () => {
		const user = userEvent.setup();
		const onDone = vi.fn();
		const calls = stubApi({
			[`GET ${OWN}/leave-1/changes`]: { status: 200, body: envelope([]) },
			[`POST ${OWN}/leave-1/withdrawal`]: {
				status: 200,
				body: envelope({ ...pending, status: "CANCELLED" }),
			},
		});
		show(pending, { own: true, onDone });

		await user.click(
			await screen.findByRole("button", { name: "Withdraw request" })
		);
		const dialog = await screen.findByRole("dialog");
		await user.click(
			within(dialog).getByRole("button", { name: "Withdraw request" })
		);

		await waitFor(() => {
			expect(onDone).toHaveBeenCalledOnce();
		});
		expect(calls.some((call) => call.path.endsWith("/withdrawal"))).toBe(true);
	});

	it("given_anApprovedRequest_when_theReaderMayNotChangeIt_then_offersNothing", async () => {
		stubApi({
			[`GET ${MEMBER}/leave-1/changes`]: { status: 200, body: envelope([]) },
		});
		show(approved, { canChange: false });
		await waitFor(() => {
			expect(screen.queryByRole("button")).not.toBeInTheDocument();
		});
	});

	it("given_aReviewer_when_cancelling_then_needsARemarkAndSendsIt", async () => {
		const user = userEvent.setup();
		const onDone = vi.fn();
		const calls = stubApi({
			[`GET ${MEMBER}/leave-1/changes`]: { status: 200, body: envelope([]) },
			[`POST ${MEMBER}/leave-1/cancellation`]: {
				status: 200,
				body: envelope({ ...approved, status: "CANCELLED" }),
			},
		});
		show(approved, { canChange: true, onDone });

		await user.click(
			await screen.findByRole("button", { name: "Cancel leave…" })
		);
		const dialog = await screen.findByRole("dialog");
		const confirm = within(dialog).getByRole("button", {
			name: "Cancel leave",
		});
		expect(confirm).toBeDisabled();
		await user.type(within(dialog).getByRole("textbox"), "Back early");
		await user.click(confirm);

		await waitFor(() => {
			expect(onDone).toHaveBeenCalledOnce();
		});
		expect(
			calls.find((call) => call.path.endsWith("/cancellation"))?.body
		).toEqual({ remark: "Back early" });
	});

	it("given_datesThatDidNotMove_when_theRosterCannotBeRead_then_theChangeIsNotHeldBack", async () => {
		const user = userEvent.setup();
		stubApi({
			[`GET ${MEMBER}/leave-1/changes`]: { status: 200, body: envelope([]) },
			[`GET ${MEMBER}/rostered-days`]: problemReply(404, "SOMETHING_ELSE"),
			[LEAVE_TYPES]: { status: 200, body: envelope([]) },
		});
		show(approved, { canChange: true });

		await user.click(
			await screen.findByRole("button", { name: "Change leave…" })
		);
		const dialog = await screen.findByRole("dialog");
		await user.type(within(dialog).getByRole("textbox"), "Corrected");

		await waitFor(() => {
			expect(
				within(dialog).getByRole("button", { name: "Save change" })
			).toBeEnabled();
		});
		expect(
			within(dialog).queryByText(/couldn’t check the roster/)
		).not.toBeInTheDocument();
	});

	it("given_movedDatesWhoseRosterCannotBeRead_when_changing_then_cannotConfirmAndCanRetry", async () => {
		const user = userEvent.setup();
		stubApi({
			[`GET ${MEMBER}/leave-1/changes`]: { status: 200, body: envelope([]) },
			[`GET ${MEMBER}/rostered-days`]: (call) =>
				call.search.includes("endDate=2026-06-05")
					? { status: 200, body: envelope([]) }
					: problemReply(404, "SOMETHING_ELSE"),
			[LEAVE_TYPES]: { status: 200, body: envelope([]) },
		});
		show(approved, { canChange: true });

		await user.click(
			await screen.findByRole("button", { name: "Change leave…" })
		);
		const dialog = await screen.findByRole("dialog");
		await user.type(within(dialog).getByRole("textbox"), "Corrected");
		await user.click(
			within(dialog).getByRole("button", { name: /Leave dates|01 Jun/ })
		);
		await user.click(screen.getByRole("gridcell", { name: /, 2 June 2026/ }));
		await user.click(screen.getByRole("gridcell", { name: /, 3 June 2026/ }));

		await within(dialog).findByText(/couldn’t check the roster/);
		expect(
			within(dialog).getByRole("button", { name: "Try again" })
		).toBeInTheDocument();
		expect(
			within(dialog).getByRole("button", { name: "Save change" })
		).toBeDisabled();
	});
});
