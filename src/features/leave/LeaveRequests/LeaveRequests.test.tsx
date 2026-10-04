import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import { sampleRequests } from "@/features/leave/sampleData";
import { LeaveRequests } from "@/features/leave/LeaveRequests";

it("sorts the whole result before paging and resets the page when filtering", async () => {
	const user = userEvent.setup();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequests
				requests={sampleRequests}
				onApprove={vi.fn()}
				onOpen={vi.fn()}
			/>
		</I18nextProvider>
	);
	await user.click(screen.getByRole("button", { name: /Sort by Employee/i }));
	expect(
		within(screen.getAllByRole("row")[1]!).getByText("Adam Chan")
	).toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: "Next page" }));
	expect(screen.getByText("11–20 of 24 entries")).toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: "Showing" }));
	await user.click(screen.getByRole("option", { name: "Rejected" }));
	expect(screen.getByText("1–1 of 1 entries")).toBeInTheDocument();
	expect(screen.getByText("Faris Ahmad")).toBeInTheDocument();
	expect(
		screen.getByRole("button", { name: "Approve request for Faris Ahmad" })
	).toBeDisabled();
});
