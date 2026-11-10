import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	type RenderResult,
	render as renderPlain,
	screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import { approvalKeys } from "@/features/approvals/api";
import { leaveAtHrInstanceFixture } from "@/features/approvals/fixtures";
import {
	LEAVE_FIXTURES,
	LEAVE_TYPE_FIXTURES,
	leaveAtStepFixture,
} from "@/features/leave/fixtures";
import {
	LeaveRequestDialog,
	type LeaveApplyFormInput,
	type LeaveReview,
} from "@/features/leave/LeaveRequestDialog";

/** The dialog reads rostered days, and an approval's steps, through the query cache. */
const render = (
	ui: ReactElement,
	client: QueryClient = new QueryClient()
): RenderResult => {
	return renderPlain(ui, {
		wrapper: ({ children }) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		),
	});
};

/** A reviewer whose turn it is, who does not read the approval's steps; `overrides` replace any part. */
const reviewWith = (overrides: Partial<LeaveReview> = {}): LeaveReview => ({
	canReview: true,
	readsApprovalSteps: false,
	busy: false,
	onApprove: vi.fn(),
	onReject: vi.fn(),
	...overrides,
});

/** An application with no leave types read yet; `overrides` replace any part. */
const applyFormWith = (
	overrides: Partial<LeaveApplyFormInput> = {}
): LeaveApplyFormInput => ({
	busy: false,
	leaveTypes: [],
	onCreate: vi.fn(),
	...overrides,
});

const pending = LEAVE_FIXTURES[1]!;
/** Before the pending request's first day, so approving it needs no comment. */
const BEFORE_THE_LEAVE = "2026-05-01";
/** After the pending request's first day: approving it corrects history, so it needs a comment. */
const AFTER_THE_LEAVE_STARTED = "2026-06-01";
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
				request={pending}
				review={reviewWith({ onReject })}
				onClose={vi.fn()}
			/>
		</I18nextProvider>
	);
	expect(screen.getByText("Moses Lee")).toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: "Reject" }));
	const reason = screen.getByRole("textbox", { name: "Reason for rejection" });
	expect(reason).toHaveAttribute("maxLength", "2000");
	await user.type(reason, "   ");
	expect(screen.getByRole("button", { name: "Confirm rejection" })).toHaveClass(
		"bg-error-600"
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
	const onApprove = vi.fn<LeaveReview["onApprove"]>();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				request={pending}
				review={reviewWith({ onApprove })}
				today={BEFORE_THE_LEAVE}
				onClose={vi.fn()}
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
	expect(onApprove).toHaveBeenLastCalledWith(pending, "", false);
	await user.type(
		screen.getByRole("textbox", { name: "Comment (optional)" }),
		"  Enjoy the break. "
	);
	await user.click(screen.getByRole("button", { name: "Confirm approval" }));
	expect(onApprove).toHaveBeenLastCalledWith(
		pending,
		"Enjoy the break.",
		false
	);
});

it("asks for a comment before approving leave that started before today, then sends it", async () => {
	const user = userEvent.setup();
	const onApprove = vi.fn<LeaveReview["onApprove"]>();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				mode="approve"
				request={pending}
				review={reviewWith({ onApprove })}
				today={AFTER_THE_LEAVE_STARTED}
				onClose={vi.fn()}
			/>
		</I18nextProvider>
	);
	const comment = screen.getByRole("textbox", { name: "Comment" });
	expect(comment).toBeRequired();
	expect(
		screen.getByText(
			"This leave includes days before today, so say why. The employee will see this."
		)
	).toBeInTheDocument();
	// Blank passes the browser's required check; the dialog's own check catches it.
	await user.type(comment, "   ");
	await user.click(screen.getByRole("button", { name: "Confirm approval" }));
	expect(onApprove).not.toHaveBeenCalled();
	expect(comment).toHaveAccessibleDescription(
		"Enter a comment: this leave includes days before today."
	);
	await user.clear(comment);
	await user.type(comment, " Approved after the fact. ");
	await user.click(screen.getByRole("button", { name: "Confirm approval" }));
	expect(onApprove).toHaveBeenLastCalledWith(
		pending,
		"Approved after the fact.",
		false
	);
});

it("opens at the approval step and shows a refused comment on its field", () => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				mode="approve"
				request={pending}
				today={BEFORE_THE_LEAVE}
				review={reviewWith({
					refusal: {
						fields: { comment: "Enter a comment of up to 2,000 characters." },
						refreshMembers: false,
					},
				})}
				onClose={vi.fn()}
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

it("shows an approved request's comment", () => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog request={LEAVE_FIXTURES[3]} onClose={vi.fn()} />
		</I18nextProvider>
	);
	expect(
		screen.getByText("Approval comment").nextElementSibling
	).toHaveTextContent("Enjoy the break.");
});

it("offers no decision to someone who may not decide, and shows a rejected request's reason and reviewer", () => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog request={pending} onClose={vi.fn()} />
		</I18nextProvider>
	);
	expect(
		screen.queryByRole("button", { name: "Reject" })
	).not.toBeInTheDocument();
	expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				request={LEAVE_FIXTURES[2]}
				review={reviewWith()}
				onClose={vi.fn()}
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
				mode="apply"
				applyForm={applyFormWith({
					employees,
					leaveTypes: LEAVE_TYPE_FIXTURES,
					onCreate,
				})}
				onClose={vi.fn()}
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
				mode="apply"
				applyForm={applyFormWith({
					employees,
					leaveTypes: LEAVE_TYPE_FIXTURES,
					refusal: {
						fields: {
							endDate: "They already have leave on one of these days.",
						},
						refreshMembers: false,
					},
					onCreate,
				})}
				onClose={vi.fn()}
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
				applyForm={applyFormWith({ leaveTypes: LEAVE_TYPE_FIXTURES, onCreate })}
				mode="apply"
				onClose={vi.fn()}
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
	const onCreate = vi.fn<LeaveApplyFormInput["onCreate"]>();
	const view = render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				applyForm={applyFormWith({ leaveTypes: LEAVE_TYPE_FIXTURES, onCreate })}
				mode="apply"
				onClose={vi.fn()}
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
				applyForm={applyFormWith({
					leaveTypes: LEAVE_TYPE_FIXTURES,
					refusal: {
						fields: { notes: "Use 1,000 characters or fewer." },
						refreshMembers: false,
					},
					onCreate,
				})}
				onClose={vi.fn()}
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

it("shows the request's remarks with their line breaks, and no Remarks row when the API sends none", () => {
	const view = render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog request={pending} onClose={vi.fn()} />
		</I18nextProvider>
	);
	expect(screen.getByText("Remarks")).toBeInTheDocument();
	expect(
		screen.getByText(/Handover notes are with Ben\.\s+Back on Friday\./)
	).toHaveClass("whitespace-pre-line");
	view.rerender(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog request={LEAVE_FIXTURES[0]} onClose={vi.fn()} />
		</I18nextProvider>
	);
	// Remarks are withheld from people who may not read them, so absent remarks leave no row behind.
	expect(screen.queryByText("Remarks")).not.toBeInTheDocument();
});

it("shows no reason row for a rejected request whose reason the API withholds", () => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				request={{ ...LEAVE_FIXTURES[2]!, rejectionReason: null }}
				onClose={vi.fn()}
			/>
		</I18nextProvider>
	);
	expect(screen.getByText("Rejected")).toBeInTheDocument();
	expect(screen.queryByText("Reason for rejection")).not.toBeInTheDocument();
});

it("offers the company's applicable leave types grouped by how they are counted", async () => {
	const user = userEvent.setup();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				applyForm={applyFormWith({ leaveTypes: LEAVE_TYPE_FIXTURES })}
				mode="apply"
				onClose={vi.fn()}
			/>
		</I18nextProvider>
	);
	const type = screen.getByRole("button", { name: "Type" });
	expect(type).toHaveTextContent("Annual leave");
	await user.click(type);
	expect(
		screen.getAllByRole("group").map((group) => group.firstChild?.textContent)
	).toEqual(["Yearly allowance", "Per occasion", "No allowance"]);
	expect(screen.getByRole("group", { name: "Per occasion" })).toContainElement(
		screen.getByRole("option", { name: "Paternity leave" })
	);
	expect(
		screen.queryByRole("option", { name: "Day off" })
	).not.toBeInTheDocument();
});

it("asks for a reason when the chosen leave type requires one, and sends it as remarks", async () => {
	const user = userEvent.setup();
	const onCreate = vi.fn<LeaveApplyFormInput["onCreate"]>();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				applyForm={applyFormWith({ leaveTypes: LEAVE_TYPE_FIXTURES, onCreate })}
				mode="apply"
				onClose={vi.fn()}
			/>
		</I18nextProvider>
	);
	await user.type(
		screen.getByRole("textbox", { name: "Remarks (optional)" }),
		" "
	);
	await user.click(screen.getByRole("button", { name: "Type" }));
	await user.click(screen.getByRole("option", { name: "Other" }));
	const reason = screen.getByRole("textbox", { name: "Reason" });
	expect(reason).toBeRequired();
	expect(reason).toHaveAttribute("placeholder", "What is this leave for?");
	expect(reason).toHaveAccessibleDescription(
		"Say what this leave is for. Reviewers of this request can read it."
	);
	await user.click(screen.getByRole("button", { name: "Submit request" }));
	expect(onCreate).not.toHaveBeenCalled();
	expect(reason).toHaveAccessibleDescription("Enter what this leave is for.");
	await user.type(reason, "Jury service");
	expect(reason).not.toHaveAccessibleDescription(
		"Enter what this leave is for."
	);
	await user.click(screen.getByRole("button", { name: "Submit request" }));
	expect(onCreate).toHaveBeenCalledWith(
		null,
		expect.objectContaining({ leaveType: "OTHER", notes: "Jury service" })
	);
	await user.click(screen.getByRole("button", { name: "Type" }));
	await user.click(screen.getByRole("option", { name: "Annual leave" }));
	expect(
		screen.getByRole("textbox", { name: "Remarks (optional)" })
	).toHaveValue(" Jury service");
});

it("shows a refused leave type on the type field", () => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				mode="apply"
				applyForm={applyFormWith({
					leaveTypes: LEAVE_TYPE_FIXTURES,
					refusal: {
						fields: {
							type: "This leave type is no longer offered. Choose another.",
						},
						refreshMembers: false,
					},
				})}
				onClose={vi.fn()}
			/>
		</I18nextProvider>
	);
	expect(
		screen.getByRole("button", { name: "Type" })
	).toHaveAccessibleDescription(
		"This leave type is no longer offered. Choose another."
	);
});

it("cannot submit before the company's leave types arrive", () => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				applyForm={applyFormWith()}
				mode="apply"
				onClose={vi.fn()}
			/>
		</I18nextProvider>
	);
	expect(screen.getByRole("button", { name: "Submit request" })).toBeDisabled();
});

it("says the leave types are loading, and holds Submit, while they are read", () => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				applyForm={applyFormWith({ leaveTypesStatus: "pending" })}
				mode="apply"
				onClose={vi.fn()}
			/>
		</I18nextProvider>
	);

	const type = screen.getByRole("button", { name: "Type" });
	expect(type).toHaveTextContent("Loading leave types…");
	expect(type).toBeDisabled();
	expect(screen.getByRole("button", { name: "Submit request" })).toBeDisabled();
});

it("explains leave types that failed to load and offers to read them again", async () => {
	const user = userEvent.setup();
	const onRetryLeaveTypes = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				mode="apply"
				applyForm={applyFormWith({
					leaveTypesStatus: "error",
					onRetryLeaveTypes,
				})}
				onClose={vi.fn()}
			/>
		</I18nextProvider>
	);

	expect(screen.getByRole("alert")).toHaveTextContent(
		"We couldn’t load the leave types."
	);
	expect(
		screen.queryByRole("button", { name: "Type" })
	).not.toBeInTheDocument();
	expect(screen.getByRole("button", { name: "Submit request" })).toBeDisabled();
	await user.click(screen.getByRole("button", { name: "Try again" }));
	expect(onRetryLeaveTypes).toHaveBeenCalledTimes(1);
});

it("shows a reviewer who reads approvals the steps of a request under a flow, and who decided them", () => {
	const client = new QueryClient();
	client.setQueryData(
		approvalKeys.instance("c-1", "ai-leave"),
		leaveAtHrInstanceFixture()
	);
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				lifecycle={{ companyId: "c-1", own: false, onDone: vi.fn() }}
				request={leaveAtStepFixture(2)}
				review={reviewWith({ readsApprovalSteps: true })}
				onClose={vi.fn()}
			/>
		</I18nextProvider>,
		client
	);
	const approval = screen.getByRole("region", { name: "Approval" });
	expect(approval).toHaveTextContent("Manager");
	expect(approval).toHaveTextContent("Siti Rahman");
	expect(approval).toHaveTextContent("Covered by Ahmad on Sat.");
	expect(approval).toHaveTextContent("HR");
});

it("shows the member only the step their own request waits on", () => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				lifecycle={{ companyId: "c-1", own: true, onDone: vi.fn() }}
				request={leaveAtStepFixture(1)}
				review={reviewWith({ canReview: false, readsApprovalSteps: true })}
				onClose={vi.fn()}
			/>
		</I18nextProvider>
	);
	expect(screen.getByRole("region", { name: "Approval" })).toHaveTextContent(
		"Waiting for approval · step 1 of 2 (Manager)"
	);
	expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
});

it("asks no comment for past leave at a step before the last, and keeps the approval route's limit", async () => {
	const user = userEvent.setup();
	const onApprove = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				request={leaveAtStepFixture(1)}
				review={reviewWith({ onApprove })}
				today={AFTER_THE_LEAVE_STARTED}
				onClose={vi.fn()}
			/>
		</I18nextProvider>
	);
	await user.click(screen.getByRole("button", { name: "Approve" }));
	expect(
		screen.getByRole("textbox", { name: "Comment (optional)" })
	).toHaveAttribute("maxlength", "500");
	await user.click(screen.getByRole("button", { name: "Confirm approval" }));
	expect(onApprove).toHaveBeenCalledWith(leaveAtStepFixture(1), "", false);
});

it("asks the comment for past leave at the last step, as a single review does", async () => {
	const user = userEvent.setup();
	const onApprove = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				request={leaveAtStepFixture(2)}
				review={reviewWith({ onApprove })}
				today={AFTER_THE_LEAVE_STARTED}
				onClose={vi.fn()}
			/>
		</I18nextProvider>
	);
	await user.click(screen.getByRole("button", { name: "Approve" }));
	expect(screen.getByRole("textbox", { name: "Comment" })).toBeRequired();
	await user.click(screen.getByRole("button", { name: "Confirm approval" }));
	expect(onApprove).not.toHaveBeenCalled();
});

it("keeps the approval route's limit on a rejection reason at a flow's step", async () => {
	const user = userEvent.setup();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRequestDialog
				request={leaveAtStepFixture(1)}
				review={reviewWith()}
				onClose={vi.fn()}
			/>
		</I18nextProvider>
	);
	await user.click(screen.getByRole("button", { name: "Reject" }));
	expect(
		screen.getByRole("textbox", { name: "Reason for rejection" })
	).toHaveAttribute("maxLength", "500");
});
