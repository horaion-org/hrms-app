import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as Router from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { renderAuthPage } from "@/features/auth/testing";
import { useToastStore } from "@/store/useToastStore";

const navigate = vi.hoisted(() => vi.fn());
const forgotPassword = vi.hoisted(() => vi.fn());
const confirmForgotPassword = vi.hoisted(() => vi.fn());

vi.mock(
	"@tanstack/react-router",
	async (importOriginal): Promise<typeof Router> => ({
		...(await importOriginal<typeof Router>()),
		useNavigate: () => navigate,
	})
);
vi.mock("@/features/auth/cognito", () => ({
	forgotPassword,
	confirmForgotPassword,
}));

beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.stubGlobal("matchMedia", () => ({ matches: true }));
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	navigate.mockReset();
	forgotPassword.mockReset();
	confirmForgotPassword.mockReset();
	act(() => {
		useToastStore.setState({ toasts: [] });
	});
});

describe("ForgotPasswordPage", () => {
	it("sends a code, then resets the password with it", async () => {
		const user = userEvent.setup();
		forgotPassword.mockResolvedValue(undefined);
		confirmForgotPassword.mockResolvedValue(undefined);
		renderAuthPage(<ForgotPasswordPage />);

		await user.type(
			await screen.findByLabelText("Email address", { selector: "input" }),
			"jose@acme.test"
		);
		await user.click(screen.getByRole("button", { name: "Send reset code" }));

		await user.type(
			await screen.findByLabelText("Reset code", { selector: "input" }),
			"123456"
		);
		expect(
			screen.getByLabelText("Email address", { selector: "input" })
		).toHaveValue("jose@acme.test");
		await user.type(
			screen.getByLabelText("New password", { selector: "input" }),
			"N3w!password"
		);
		await user.click(screen.getByRole("button", { name: "Change password" }));

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith({ to: "/sign-in" });
		});
		expect(forgotPassword).toHaveBeenCalledWith("jose@acme.test");
		expect(confirmForgotPassword).toHaveBeenCalledWith(
			"jose@acme.test",
			"123456",
			"N3w!password"
		);
	});

	it("shows a failure to send on the email field", async () => {
		forgotPassword.mockRejectedValue(new Error("Attempt limit exceeded"));
		renderAuthPage(<ForgotPasswordPage />);

		await userEvent.type(
			await screen.findByLabelText("Email address", { selector: "input" }),
			"jose@acme.test"
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Send reset code" })
		);

		expect(
			await screen.findByLabelText("Email address", { selector: "input" })
		).toHaveAccessibleDescription("Attempt limit exceeded");
		expect(screen.queryByLabelText("Reset code")).not.toBeInTheDocument();
	});
});
