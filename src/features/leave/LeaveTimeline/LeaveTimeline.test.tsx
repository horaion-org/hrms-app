import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import { FIXTURE_RANGE, LEAVE_FIXTURES } from "@/features/leave/fixtures";
import { LeaveTimeline } from "@/features/leave/LeaveTimeline";

it("draws pending and approved bars in the window, never rejected ones", async () => {
	const user = userEvent.setup();
	const onOpen = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveTimeline
				range={FIXTURE_RANGE}
				requests={LEAVE_FIXTURES}
				onOpen={onOpen}
			/>
		</I18nextProvider>
	);
	await user.click(screen.getByRole("button", { name: /^Cheryl Ng ·/ }));
	expect(onOpen).toHaveBeenCalledWith(LEAVE_FIXTURES[1]);
	expect(
		screen.getByRole("button", { name: /^Aisha Rahman ·.*Pending$/ })
	).toBeInTheDocument();
	// Rejected: not drawn and not a row. Outside the window: not drawn.
	expect(screen.queryByText("Faris Ahmad")).not.toBeInTheDocument();
	expect(
		screen.queryByRole("button", { name: /^Moses Lee ·/ })
	).not.toBeInTheDocument();
});
