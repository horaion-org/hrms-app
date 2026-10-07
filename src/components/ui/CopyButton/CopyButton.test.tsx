import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "@/components/ui/CopyButton";
import { authTestI18n } from "@/features/auth/testingI18n";

const renderButton = (): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<CopyButton label="Copy email address" value="kent.chua@company.com" />
		</I18nextProvider>
	);
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe("CopyButton", () => {
	it("copies its value and says so", async () => {
		const user = userEvent.setup();
		renderButton();

		await user.click(
			screen.getByRole("button", { name: "Copy email address" })
		);

		await expect(navigator.clipboard.readText()).resolves.toBe(
			"kent.chua@company.com"
		);
		expect(await screen.findByRole("status")).toHaveTextContent("Copied");
	});

	it("says when the clipboard refused", async () => {
		const user = userEvent.setup();
		vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
			new Error("Denied")
		);
		renderButton();

		await user.click(
			screen.getByRole("button", { name: "Copy email address" })
		);

		await waitFor(() => {
			expect(screen.getByRole("status")).toHaveTextContent("Couldn’t copy");
		});
	});

	it("announces nothing until used", () => {
		renderButton();

		expect(screen.getByRole("status")).toBeEmptyDOMElement();
	});
});
