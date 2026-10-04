import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import { sampleRequests } from "@/features/leave/sampleData";
import { LeaveRequestDialog } from "@/features/leave/LeaveRequestDialog";

it("requires a meaningful rejection reason and returns to review when cancelled", async () => {
	const user = userEvent.setup();
	const onReject = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				request={sampleRequests[6]}
				onApprove={vi.fn()}
				onClose={vi.fn()}
				onCreate={vi.fn()}
				onReject={onReject}
			/>
		</I18nextProvider>
	);
	await user.click(screen.getByRole("button", { name: "Reject" }));
	await user.type(
		screen.getByRole("textbox", { name: "Reason for rejection" }),
		"   "
	);
	await user.click(screen.getByRole("button", { name: "Confirm rejection" }));
	expect(screen.getByRole("alert")).toHaveTextContent("Enter a reason");
	expect(onReject).not.toHaveBeenCalled();
	await user.click(screen.getByRole("button", { name: "Cancel" }));
	expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: "Reject" }));
	await user.type(screen.getByRole("textbox"), "Coverage needed  ");
	await user.click(screen.getByRole("button", { name: "Confirm rejection" }));
	expect(onReject).toHaveBeenCalledWith(sampleRequests[6], "Coverage needed");
});

it("creates a sample request with the selected employee and period", async () => {
	const onCreate = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				employees={sampleRequests}
				mode="apply"
				onApprove={vi.fn()}
				onClose={vi.fn()}
				onCreate={onCreate}
				onReject={vi.fn()}
			/>
		</I18nextProvider>
	);
	await userEvent.click(screen.getByRole("button", { name: "Submit request" }));
	expect(onCreate).toHaveBeenCalledWith(
		expect.objectContaining({
			employeeId: "EMP-10482",
			start: "2026-06-15",
			end: "2026-06-15",
			days: 1,
			status: "pending",
			type: "annual",
		})
	);
});
