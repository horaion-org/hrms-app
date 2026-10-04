import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { authTestI18n } from "@/features/auth/testingI18n";
import { sampleRequests } from "@/features/leave/sampleData";
import { LeaveTimeline } from "@/features/leave/LeaveTimeline";

it("opens a visible request and excludes rejected and out-of-range bars", async () => {
	const user = userEvent.setup();
	const onOpen = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveTimeline requests={sampleRequests} onOpen={onOpen} />
		</I18nextProvider>
	);
	await user.click(screen.getByRole("button", { name: /^Cheryl Ng ·/ }));
	expect(onOpen).toHaveBeenCalledWith(sampleRequests[6]);
	expect(
		screen.queryByRole("button", { name: /^Faris Ahmad ·/ })
	).not.toBeInTheDocument();
	expect(
		screen.queryByRole("button", { name: /^Moses Lee ·/ })
	).not.toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: "Next period" }));
	expect(
		screen.queryByRole("button", { name: /^Cheryl Ng ·/ })
	).not.toBeInTheDocument();
	expect(
		screen.getByRole("button", { name: /^Ryan Teo ·/ })
	).toBeInTheDocument();
	await user.click(screen.getByRole("button", { name: "Previous period" }));
	expect(
		screen.getByRole("button", { name: /^Cheryl Ng ·/ })
	).toBeInTheDocument();
});
