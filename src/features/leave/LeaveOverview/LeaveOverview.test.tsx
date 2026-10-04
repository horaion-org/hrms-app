import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import { LeaveOverview } from "@/features/leave/LeaveOverview";

it("shares approval and rejection changes between requests and timeline", async () => {
	const user = userEvent.setup();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveOverview />
		</I18nextProvider>
	);
	await user.click(
		screen.getByRole("button", { name: "Approve request for Aisha Rahman" })
	);
	expect(
		screen.getByRole("button", { name: "Approve request for Aisha Rahman" })
	).toBeDisabled();
	await user.click(screen.getByRole("tab", { name: "Timeline" }));
	expect(
		screen.getByRole("button", { name: /^Aisha Rahman ·.*Approved$/ })
	).toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: /^Cheryl Ng ·/ }));
	await user.click(screen.getByRole("button", { name: "Reject" }));
	await user.type(screen.getByRole("textbox"), "Coverage needed");
	await user.click(screen.getByRole("button", { name: "Confirm rejection" }));
	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	expect(
		screen.queryByRole("button", { name: /^Cheryl Ng ·/ })
	).not.toBeInTheDocument();
	await user.click(screen.getByRole("tab", { name: "Requests" }));
	const row = screen.getByText("Cheryl Ng").closest("tr");
	expect(within(row!).getByText("Rejected")).toBeInTheDocument();
	await user.click(
		screen.getByRole("button", { name: "View request for Cheryl Ng" })
	);
	expect(screen.getByText("Coverage needed")).toBeInTheDocument();
});

it("filters by location and resets dependent branch selection", async () => {
	const user = userEvent.setup();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveOverview />
		</I18nextProvider>
	);
	await user.click(screen.getByRole("button", { name: "Country" }));
	await user.click(screen.getByRole("option", { name: "Malaysia" }));
	expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
		"Kuala Lumpur branch"
	);
	expect(
		screen.getByText("No leave requests match these filters.")
	).toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: "Country" }));
	await user.click(screen.getByRole("option", { name: "Singapore" }));
	expect(screen.getByText("Moses Lee")).toBeInTheDocument();
});
