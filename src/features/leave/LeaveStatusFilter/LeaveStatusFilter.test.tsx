import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { LeaveStatusFilter } from "@/features/leave/LeaveStatusFilter";

it("shows every status by default and reports one, or every status again", async () => {
	const user = userEvent.setup();
	const onChange = vi.fn();
	const { rerender } = render(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveStatusFilter onChange={onChange} />
		</I18nextProvider>
	);

	const filter = screen.getByRole("button", { name: "Showing" });
	expect(filter).toHaveTextContent("All requests");
	await user.click(filter);
	await user.click(screen.getByRole("option", { name: "Rejected" }));
	expect(onChange).toHaveBeenLastCalledWith("REJECTED");

	rerender(
		<I18nextProvider i18n={authTestI18n}>
			<LeaveStatusFilter status="REJECTED" onChange={onChange} />
		</I18nextProvider>
	);
	await user.click(screen.getByRole("button", { name: "Showing" }));
	await user.click(screen.getByRole("option", { name: "All requests" }));
	expect(onChange).toHaveBeenLastCalledWith(undefined);
});
