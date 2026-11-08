import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { InvitationFilter } from "@/features/people/InvitationFilter";

it("lists everyone by default and reports one sign-in state, or everyone again", async () => {
	const user = userEvent.setup();
	const onChange = vi.fn();
	const { rerender } = render(
		<I18nextProvider i18n={authTestI18n}>
			<InvitationFilter onChange={onChange} />
		</I18nextProvider>
	);

	const filter = screen.getByRole("button", { name: "Signed in" });
	expect(filter).toHaveTextContent("Everyone");
	await user.click(filter);
	await user.click(screen.getByRole("option", { name: "Not yet (invited)" }));
	expect(onChange).toHaveBeenLastCalledWith("pending");

	rerender(
		<I18nextProvider i18n={authTestI18n}>
			<InvitationFilter value="pending" onChange={onChange} />
		</I18nextProvider>
	);
	await user.click(screen.getByRole("button", { name: "Signed in" }));
	await user.click(screen.getByRole("option", { name: "Everyone" }));
	expect(onChange).toHaveBeenLastCalledWith(undefined);
});
