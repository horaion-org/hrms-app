import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import { LEAVE_FIXTURES, leaveFixture } from "@/features/leave/fixtures";
import { LeaveRequests } from "@/features/leave/LeaveRequests";
import * as stories from "@/features/leave/LeaveRequests/LeaveRequests.stories";

const handlers = {
	onPageChange: vi.fn(),
	onSortChange: vi.fn(),
	onOpen: vi.fn(),
};

it("hands sorting and paging to the caller and offers decisions only where allowed", async () => {
	const user = userEvent.setup();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequests
				{...handlers}
				canReview={(request) => request.membershipId !== "m-cheryl"}
				page={2}
				rows={LEAVE_FIXTURES}
				sort={{ field: "requestedAt", desc: true }}
				total={25}
			/>
		</I18nextProvider>
	);
	expect(screen.getByText("11–20 of 25 entries")).toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: /Sort by Employee/i }));
	expect(handlers.onSortChange).toHaveBeenCalledWith({
		field: "displayName",
		desc: false,
	});
	await user.click(screen.getByRole("button", { name: "Next page" }));
	expect(handlers.onPageChange).toHaveBeenCalledWith(3);
	// Pending and decidable: both decisions; pending but not decidable, or decided: neither.
	expect(
		screen.getByRole("button", { name: "Approve request for Aisha Rahman" })
	).toBeEnabled();
	expect(
		screen.getByRole("button", { name: "Approve request for Cheryl Ng" })
	).toBeDisabled();
	expect(
		screen.getByRole("button", { name: "Reject request for Faris Ahmad" })
	).toBeDisabled();
	await user.click(
		screen.getByRole("button", { name: "Reject request for Aisha Rahman" })
	);
	expect(handlers.onOpen).toHaveBeenCalledWith(LEAVE_FIXTURES[0], "reject");
	await user.click(
		screen.getByRole("button", { name: "Approve request for Aisha Rahman" })
	);
	expect(handlers.onOpen).toHaveBeenCalledWith(LEAVE_FIXTURES[0], "approve");
	expect(screen.getByRole("cell", { name: "2 days" })).toBeInTheDocument();
});

it("shows each request's remarks on one line, and says when there are none", () => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequests
				{...handlers}
				canReview={() => true}
				page={1}
				rows={LEAVE_FIXTURES.slice(0, 2)}
				sort={{ field: "requestedAt", desc: true }}
				total={2}
			/>
		</I18nextProvider>
	);
	expect(
		screen.getAllByRole("columnheader").map((header) => header.textContent)
	).toContain("Remarks");
	expect(screen.getByText(/Handover notes are with Ben\./)).toHaveClass(
		"truncate"
	);
	expect(screen.getByText("No remarks")).toHaveClass("sr-only");
});

it("in own mode shows no employee column and offers only viewing", async () => {
	const user = userEvent.setup();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequests
				{...handlers}
				own
				canReview={() => true}
				emptyState="You have no leave requests yet."
				page={1}
				rows={LEAVE_FIXTURES}
				sort={{ field: "requestedAt", desc: true }}
				total={LEAVE_FIXTURES.length}
			/>
		</I18nextProvider>
	);
	expect(
		screen.getAllByRole("columnheader").map((header) => header.textContent)
	).not.toContain("Employee");
	expect(
		screen.queryByRole("button", { name: "Approve request for Aisha Rahman" })
	).not.toBeInTheDocument();
	await user.click(
		screen.getByRole("button", { name: "View request for Aisha Rahman" })
	);
	expect(handlers.onOpen).toHaveBeenCalledWith(LEAVE_FIXTURES[0]);
});

it("leaves the Remarks column out when no request on the page carries remarks", () => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequests
				{...handlers}
				canReview={() => true}
				page={1}
				rows={[LEAVE_FIXTURES[0]!, LEAVE_FIXTURES[2]!]}
				sort={{ field: "requestedAt", desc: true }}
				total={2}
			/>
		</I18nextProvider>
	);
	expect(
		screen.getAllByRole("columnheader").map((header) => header.textContent)
	).not.toContain("Remarks");
	expect(screen.queryByText("No remarks")).not.toBeInTheDocument();
});

it("keeps the employee and actions in view while the wide table scrolls", () => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequests
				{...handlers}
				canReview={() => true}
				page={1}
				rows={LEAVE_FIXTURES}
				sort={{ field: "requestedAt", desc: true }}
				total={LEAVE_FIXTURES.length}
			/>
		</I18nextProvider>
	);
	const headers = screen.getAllByRole("columnheader");
	expect(headers[0]).toHaveTextContent("Employee");
	expect(headers[0]).toHaveClass("md:sticky", "md:start-0");
	const actions = headers[headers.length - 1];
	expect(actions).toHaveTextContent("Actions");
	expect(actions).toHaveClass("md:sticky", "md:end-0");
});

it("reads each request's day in its member's Branch zone", () => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequests
				{...handlers}
				canReview={() => false}
				page={1}
				sort={{ field: "requestedAt", desc: true }}
				total={1}
				rows={[
					leaveFixture({
						leaveRequestId: "leave-early",
						requestedAt: "2026-11-09T03:00:00Z",
						branchTimeZone: "America/New_York",
					}),
				]}
			/>
		</I18nextProvider>
	);

	// In the Period column only: the name's line shows the period alone, View the request day.
	expect(screen.getByText("Requested Nov 08, 2026")).toBeInTheDocument();
});

it("counts a part day in hours and names the part under its date", () => {
	const { PartDays } = composeStories(stories);
	render(<PartDays />);

	expect(screen.getByRole("cell", { name: "4 h" })).toBeInTheDocument();
	expect(screen.getByRole("cell", { name: "2 h 30 min" })).toBeInTheDocument();
	expect(screen.getAllByText("Morning 09:00–13:00").length).toBeGreaterThan(0);
	expect(screen.getAllByText("Custom 10:00–12:30").length).toBeGreaterThan(0);
	expect(screen.getByRole("cell", { name: "2 days" })).toBeInTheDocument();
});
