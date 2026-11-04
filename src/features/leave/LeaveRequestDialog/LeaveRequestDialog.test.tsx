import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import { LEAVE_FIXTURES } from "@/features/leave/fixtures";
import {
	LeaveRequestDialog,
	type LeaveRequestDialogProps,
} from "@/features/leave/LeaveRequestDialog";

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

it("confirms an approval with an optional trimmed comment and returns to review when cancelled", async () => {
	const user = userEvent.setup();
	const onApprove = vi.fn<LeaveRequestDialogProps["onApprove"]>();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				canReview
				request={pending}
				onApprove={onApprove}
				onClose={vi.fn()}
				onCreate={vi.fn()}
				onReject={vi.fn()}
			/>
		</I18nextProvider>
	);
	await user.click(screen.getByRole("button", { name: "Approve" }));
	expect(onApprove).not.toHaveBeenCalled();
	const comment = screen.getByRole("textbox", { name: "Comment (optional)" });
	expect(comment).not.toBeRequired();
	expect(comment).toHaveAttribute("maxLength", "2000");
	await user.click(screen.getByRole("button", { name: "Cancel" }));
	expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: "Approve" }));
	await user.click(screen.getByRole("button", { name: "Confirm approval" }));
	expect(onApprove).toHaveBeenLastCalledWith(pending, "");
	await user.type(
		screen.getByRole("textbox", { name: "Comment (optional)" }),
		"  Enjoy the break. "
	);
	await user.click(screen.getByRole("button", { name: "Confirm approval" }));
	expect(onApprove).toHaveBeenLastCalledWith(pending, "Enjoy the break.");
});

it("opens at the approval step and shows a refused comment on its field", () => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				canReview
				mode="approve"
				request={pending}
				refusal={{
					fields: { comment: "Enter a comment of up to 2,000 characters." },
					refreshMembers: false,
				}}
				onApprove={vi.fn()}
				onClose={vi.fn()}
				onCreate={vi.fn()}
				onReject={vi.fn()}
			/>
		</I18nextProvider>
	);
	expect(
		screen.getByRole("button", { name: "Confirm approval" })
	).toBeInTheDocument();
	expect(
		screen.getByRole("textbox", { name: "Comment (optional)" })
	).toHaveAccessibleDescription("Enter a comment of up to 2,000 characters.");
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

it("sends trimmed remarks, counts them as they are typed, and leaves them out when empty", async () => {
	const user = userEvent.setup();
	const onCreate = vi.fn<LeaveRequestDialogProps["onCreate"]>();
	const view = render(
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
	const remarks = screen.getByRole("textbox", { name: "Remarks (optional)" });
	expect(remarks).toHaveAttribute("maxLength", "1000");
	expect(screen.getByText("0/1000")).toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: "Submit request" }));
	expect(onCreate.mock.lastCall?.[1]).not.toHaveProperty("notes");
	await user.type(remarks, "  Back on Friday. ");
	expect(screen.getByText("18/1000")).toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: "Submit request" }));
	expect(onCreate).toHaveBeenLastCalledWith(
		null,
		expect.objectContaining({ notes: "Back on Friday." })
	);
	view.rerender(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				mode="apply"
				refusal={{
					fields: { notes: "Use 1,000 characters or fewer." },
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
		"Use 1,000 characters or fewer."
	);
	expect(
		screen.getByRole("textbox", { name: "Remarks (optional)" })
	).toHaveAccessibleDescription("Use 1,000 characters or fewer.");
});

it("shows the request's remarks with their line breaks, or none", () => {
	const view = render(
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
	expect(screen.getByText("Remarks")).toBeInTheDocument();
	expect(
		screen.getByText(/Handover notes are with Ben\.\s+Back on Friday\./)
	).toHaveClass("whitespace-pre-line");
	view.rerender(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				request={LEAVE_FIXTURES[0]}
				onApprove={vi.fn()}
				onClose={vi.fn()}
				onCreate={vi.fn()}
				onReject={vi.fn()}
			/>
		</I18nextProvider>
	);
	expect(screen.getByText("Remarks").nextElementSibling).toHaveTextContent(
		"None"
	);
});
