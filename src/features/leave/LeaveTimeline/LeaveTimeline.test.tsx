import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import { FIXTURE_RANGE, LEAVE_FIXTURES } from "@/features/leave/fixtures";
import { LeaveTimeline } from "@/features/leave/LeaveTimeline";

it("draws pending and approved bars in the window, never rejected ones, and hands the window to the caller", async () => {
	const user = userEvent.setup();
	const onOpen = vi.fn();
	const onRangeChange = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveTimeline
				range={FIXTURE_RANGE}
				requests={LEAVE_FIXTURES}
				onOpen={onOpen}
				onRangeChange={onRangeChange}
			/>
		</I18nextProvider>
	);
	await user.click(screen.getByRole("button", { name: /^Cheryl Ng ·/ }));
	expect(onOpen).toHaveBeenCalledWith(LEAVE_FIXTURES[1]);
	expect(
		screen.getByRole("button", { name: /^Aisha Rahman ·.*Pending$/ })
	).toBeInTheDocument();
	// Rejected: not drawn and not a row. Outside the window: drawn only once the window moves.
	expect(screen.queryByText("Faris Ahmad")).not.toBeInTheDocument();
	expect(
		screen.queryByRole("button", { name: /^Moses Lee ·/ })
	).not.toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: "Next period" }));
	expect(onRangeChange).toHaveBeenCalledWith({
		start: "2026-06-15",
		end: "2026-07-12",
	});
	await user.click(screen.getByRole("button", { name: "Previous period" }));
	expect(onRangeChange).toHaveBeenCalledWith({
		start: "2026-04-20",
		end: "2026-05-17",
	});
});
