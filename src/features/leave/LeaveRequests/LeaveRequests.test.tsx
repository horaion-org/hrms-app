import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import { LEAVE_FIXTURES } from "@/features/leave/fixtures";
import { LeaveRequests } from "@/features/leave/LeaveRequests";

const handlers = {
	onPageChange: vi.fn(),
	onSortChange: vi.fn(),
	onStatusChange: vi.fn(),
	onOpen: vi.fn(),
	onApprove: vi.fn(),
};

it("hands sorting, filtering and paging to the caller and offers decisions only where allowed", async () => {
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
	await user.click(screen.getByRole("button", { name: "Showing" }));
	await user.click(screen.getByRole("option", { name: "Rejected" }));
	expect(handlers.onStatusChange).toHaveBeenCalledWith("REJECTED");
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
	expect(handlers.onOpen).toHaveBeenCalledWith(LEAVE_FIXTURES[0], true);
	await user.click(
		screen.getByRole("button", { name: "Approve request for Aisha Rahman" })
	);
	expect(handlers.onApprove).toHaveBeenCalledWith(LEAVE_FIXTURES[0]);
	expect(screen.getByText("2 days")).toBeInTheDocument();
});
