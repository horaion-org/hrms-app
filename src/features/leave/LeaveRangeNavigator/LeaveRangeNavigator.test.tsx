import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { FIXTURE_RANGE } from "@/features/leave/fixtures";
import { LeaveRangeNavigator } from "@/features/leave/LeaveRangeNavigator";

it("steps the window back and on by its own length", async () => {
	const user = userEvent.setup();
	const onRangeChange = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveRangeNavigator
				range={FIXTURE_RANGE}
				onRangeChange={onRangeChange}
			/>
		</I18nextProvider>
	);

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
