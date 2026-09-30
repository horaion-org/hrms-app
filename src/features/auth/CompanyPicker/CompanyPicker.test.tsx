import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, expect, it, vi } from "vitest";
import { CompanyPicker } from "@/features/auth/CompanyPicker";
import { CURRENT_COMPANY_KEY } from "@/features/auth/currentCompany";
import { authTestI18n } from "@/features/auth/testingI18n";

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});
it.each([false, true])(
	"shows names and addresses and supports keyboard choice (storage blocked: %s)",
	async (blocked) => {
		if (blocked)
			vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
				throw new Error("blocked");
			});
		const choose = vi.fn();
		render(
			<I18nextProvider i18n={authTestI18n}>
				<CompanyPicker
					companies={[
						{ companyId: "a", companyName: "Acme", subdomain: "acme" },
						{
							companyId: "b",
							companyName: "North Company",
							subdomain: "north",
						},
					]}
					onChoose={choose}
				/>
			</I18nextProvider>
		);
		expect(
			screen.getByRole("heading", { name: "Choose a company" })
		).toBeVisible();
		expect(
			screen.getByRole("button", { name: "North Company north" })
		).toBeVisible();
		const user = userEvent.setup();
		await user.tab();
		expect(screen.getByRole("button", { name: "Acme acme" })).toHaveFocus();
		await user.keyboard("{Enter}");
		expect(choose).toHaveBeenCalledExactlyOnceWith("a");
		if (!blocked) expect(localStorage.getItem(CURRENT_COMPANY_KEY)).toBe("a");
	}
);
