import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { LEAVE_TYPE_FIXTURES } from "@/features/leave/fixtures";
import { LeaveApplyForm } from "./LeaveApplyForm";
import * as stories from "./LeaveApplyForm.stories";

const { ForSomeone } = composeStories(stories);

it("given_someoneElse_when_noPersonIsChosen_then_holdsSubmitBack", () => {
	render(<ForSomeone />);

	expect(screen.getByRole("dialog", { name: "Apply leave" })).toBeVisible();
	expect(screen.getByRole("button", { name: "Submit request" })).toBeDisabled();
});

it("given_theCallerThemself_when_submitted_then_appliesWithNoPerson", async () => {
	const onCreate = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveApplyForm
				busy={false}
				leaveTypes={LEAVE_TYPE_FIXTURES}
				onClose={vi.fn()}
				onCreate={onCreate}
			/>
		</I18nextProvider>
	);

	expect(screen.getByRole("dialog", { name: "Apply for leave" })).toBeVisible();
	expect(
		screen.queryByRole("searchbox", { name: "Search employees" })
	).not.toBeInTheDocument();
	await userEvent.click(screen.getByRole("button", { name: "Submit request" }));

	expect(onCreate).toHaveBeenCalledOnce();
	expect(onCreate.mock.calls[0]?.[0]).toBeNull();
});
