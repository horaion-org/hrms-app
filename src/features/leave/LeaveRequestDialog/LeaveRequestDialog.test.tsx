import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import { LEAVE_FIXTURES } from "@/features/leave/fixtures";
import { LeaveRequestDialog } from "@/features/leave/LeaveRequestDialog";

const pending = LEAVE_FIXTURES[1]!;
const employees = {
	search: "",
	onSearch: vi.fn(),
	options: [
		{
			membershipId: "m-aisha",
			displayName: "Aisha Rahman",
			employeeCode: "EMP-10517",
		},
	],
};

it("requires a meaningful rejection reason and returns to review when cancelled", async () => {
	const user = userEvent.setup();
	const onReject = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				canReview
				request={pending}
				onApprove={vi.fn()}
				onClose={vi.fn()}
				onCreate={vi.fn()}
				onReject={onReject}
			/>
		</I18nextProvider>
	);
	expect(screen.getByText("Moses Lee")).toBeInTheDocument();
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
	expect(onReject).toHaveBeenCalledWith(pending, "Coverage needed");
});

it("offers no decision to someone who may not decide, and shows a rejected request's reason and reviewer", () => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				request={pending}
				onApprove={vi.fn()}
				onClose={vi.fn()}
				onCreate={vi.fn()}
				onReject={vi.fn()}
			/>
		</I18nextProvider>
	);
	expect(
		screen.queryByRole("button", { name: "Reject" })
	).not.toBeInTheDocument();
	expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				canReview
				request={LEAVE_FIXTURES[2]}
				onApprove={vi.fn()}
				onClose={vi.fn()}
				onCreate={vi.fn()}
				onReject={vi.fn()}
			/>
		</I18nextProvider>
	);
	expect(
		screen.getByText("Coverage needed for the team event.")
	).toBeInTheDocument();
	expect(screen.getAllByText("Moses Lee")).not.toHaveLength(0);
	expect(
		screen.queryByRole("button", { name: "Approve" })
	).not.toBeInTheDocument();
});

it("applies for the chosen employee with the chosen type and dates, and shows a refusal where it landed", async () => {
	const user = userEvent.setup();
	const onCreate = vi.fn();
	const view = render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				employees={employees}
				mode="apply"
				onApprove={vi.fn()}
				onClose={vi.fn()}
				onCreate={onCreate}
				onReject={vi.fn()}
			/>
		</I18nextProvider>
	);
	expect(screen.getByRole("button", { name: "Submit request" })).toBeDisabled();
	await user.type(
		screen.getByRole("searchbox", { name: "Search employees" }),
		"Ai"
	);
	expect(employees.onSearch).toHaveBeenCalledWith("A");
	await user.click(screen.getByRole("button", { name: "Employee" }));
	await user.click(
		screen.getByRole("option", { name: "Aisha Rahman · EMP-10517" })
	);
	await user.click(screen.getByRole("button", { name: "Type" }));
	await user.click(screen.getByRole("option", { name: "Sick leave" }));
	await user.click(screen.getByRole("button", { name: "Submit request" }));
	expect(onCreate).toHaveBeenCalledWith(
		"m-aisha",
		expect.objectContaining({ leaveType: "SICK" })
	);
	view.rerender(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				employees={employees}
				mode="apply"
				refusal={{
					fields: { endDate: "They already have leave on one of these days." },
					refreshMembers: false,
				}}
				onApprove={vi.fn()}
				onClose={vi.fn()}
				onCreate={onCreate}
				onReject={vi.fn()}
			/>
		</I18nextProvider>
	);
	expect(screen.getByRole("alert")).toHaveTextContent(
		"They already have leave on one of these days."
	);
});

it("applies for the caller themself when no employees are offered", async () => {
	const user = userEvent.setup();
	const onCreate = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				mode="apply"
				onApprove={vi.fn()}
				onClose={vi.fn()}
				onCreate={onCreate}
				onReject={vi.fn()}
			/>
		</I18nextProvider>
	);
	expect(
		screen.getByRole("dialog", { name: "Apply for leave" })
	).toBeInTheDocument();
	expect(
		screen.queryByRole("searchbox", { name: "Search employees" })
	).not.toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: "Submit request" }));
	expect(onCreate).toHaveBeenCalledWith(
		null,
		expect.objectContaining({ leaveType: "ANNUAL" })
	);
});
