import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as Router from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmEmailPage } from "@/features/auth/ConfirmEmailPage";
import { renderAuthPage } from "@/features/auth/testing";
import { useToastStore } from "@/store/useToastStore";

const navigate = vi.hoisted(() => vi.fn());
const confirmSignUp = vi.hoisted(() => vi.fn());
const resendConfirmationCode = vi.hoisted(() => vi.fn());

vi.mock(
	"@tanstack/react-router",
	async (importOriginal): Promise<typeof Router> => ({
		...(await importOriginal<typeof Router>()),
		useNavigate: () => navigate,
	})
);
vi.mock("@/features/auth/cognito", () => ({
	confirmSignUp,
	resendConfirmationCode,
}));

beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.stubGlobal("matchMedia", () => ({ matches: true }));
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	navigate.mockReset();
	confirmSignUp.mockReset();
	resendConfirmationCode.mockReset();
	act(() => {
		useToastStore.setState({ toasts: [] });
	});
});

const entry = "/confirm-email?email=jose%40acme.test";

describe("ConfirmEmailPage", () => {
	it("names the address from the URL and confirms the code", async () => {
		confirmSignUp.mockResolvedValue(undefined);
		renderAuthPage(<ConfirmEmailPage />, entry);

		expect(
			await screen.findByText(
				"We emailed a confirmation code to jose@acme.test."
			)
		).toBeInTheDocument();
		await userEvent.type(
			screen.getByLabelText("Confirmation code", { selector: "input" }),
			" 123456 "
		);
		await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith({ to: "/sign-in" });
		});
		expect(confirmSignUp).toHaveBeenCalledWith("jose@acme.test", "123456");
		expect(useToastStore.getState().toasts[0]?.message).toBe(
			"Email confirmed. You can sign in now."
		);
	});

	it("shows a refused code on the field", async () => {
		confirmSignUp.mockRejectedValue(
			new Error("Invalid verification code provided, please try again.")
		);
		renderAuthPage(<ConfirmEmailPage />, entry);

		await userEvent.type(
			await screen.findByLabelText("Confirmation code", { selector: "input" }),
			"000000"
		);
		await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

		expect(
			await screen.findByLabelText("Confirmation code", { selector: "input" })
		).toHaveAccessibleDescription(
			"Invalid verification code provided, please try again."
		);
		expect(navigate).not.toHaveBeenCalled();
	});

	it("sends another code and reports failures as a toast", async () => {
		resendConfirmationCode
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error("Attempt limit exceeded"));
		renderAuthPage(<ConfirmEmailPage />, entry);

		const resend = await screen.findByRole("button", {
			name: "Send another code",
		});
		await userEvent.click(resend);
		await waitFor(() => {
			expect(useToastStore.getState().toasts).toHaveLength(1);
		});
		await userEvent.click(resend);
		await waitFor(() => {
			expect(useToastStore.getState().toasts).toHaveLength(2);
		});

		expect(resendConfirmationCode).toHaveBeenCalledWith("jose@acme.test");
		expect(useToastStore.getState().toasts.map((toast) => toast.tone)).toEqual([
			"success",
			"error",
		]);
	});
});
