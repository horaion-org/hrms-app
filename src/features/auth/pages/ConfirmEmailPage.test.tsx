import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as Router from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { problemReply, stubApi } from "@/common/testing/stubApi";
import { ConfirmEmailPage } from "@/features/auth/pages/ConfirmEmailPage";
import { renderAuthPage } from "@/features/auth/testing";
import { useToastStore } from "@/store/useToastStore";

const navigate = vi.hoisted(() => vi.fn());

vi.mock(
	"@tanstack/react-router",
	async (importOriginal): Promise<typeof Router> => ({
		...(await importOriginal<typeof Router>()),
		useNavigate: () => navigate,
	})
);

beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.stubGlobal("matchMedia", () => ({ matches: true }));
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	navigate.mockReset();
	act(() => {
		useToastStore.setState({ toasts: [] });
	});
});

const entry = "/confirm-email?email=jose%40acme.test";

describe("ConfirmEmailPage", () => {
	it("names the address from the URL and confirms the code", async () => {
		const calls = stubApi({
			"POST /api/v1/public/sign-up-confirmations": { status: 204 },
		});
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
			expect(navigate).toHaveBeenCalledWith({
				to: "/sign-in",
				search: { email: "jose@acme.test" },
			});
		});
		expect(calls[0]?.body).toEqual({ email: "jose@acme.test", code: "123456" });
		expect(useToastStore.getState().toasts[0]?.message).toBe(
			"Email confirmed. You can log in now."
		);
	});

	it.each([
		[
			problemReply(400, "INVALID_CODE"),
			"That code is not right. Check it and try again.",
		],
		[
			problemReply(429, "RATE_LIMITED", { "Retry-After": "30" }),
			"Too many attempts. Try again in 30 seconds.",
		],
		[
			{ status: 400, body: { status: 400, detail: "Code is required" } },
			"Code is required",
		],
	])(
		"shows a refused confirmation on the code field",
		async (reply, message) => {
			stubApi({ "POST /api/v1/public/sign-up-confirmations": reply });
			renderAuthPage(<ConfirmEmailPage />, entry);

			await userEvent.type(
				await screen.findByLabelText("Confirmation code", {
					selector: "input",
				}),
				"000000"
			);
			await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

			expect(
				await screen.findByLabelText("Confirmation code", { selector: "input" })
			).toHaveAccessibleDescription(message);
			expect(navigate).not.toHaveBeenCalled();
		}
	);

	it("sends another code and reports failures as a toast", async () => {
		const calls = stubApi({
			"POST /api/v1/public/sign-up-confirmation-codes": [
				{ status: 202 },
				problemReply(429, "RATE_LIMITED"),
			],
		});
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

		expect(calls[0]?.body).toEqual({ email: "jose@acme.test" });
		expect(
			useToastStore
				.getState()
				.toasts.map((toast) => [toast.tone, toast.message])
		).toEqual([
			["success", "We sent another code."],
			["error", "Too many attempts. Wait a moment and try again."],
		]);
	});

	it("asks for the address when the link has none, and never sends it empty", async () => {
		const calls = stubApi({
			"POST /api/v1/public/sign-up-confirmations": { status: 204 },
			"POST /api/v1/public/sign-up-confirmation-codes": { status: 202 },
		});
		renderAuthPage(<ConfirmEmailPage />, "/confirm-email");

		expect(
			await screen.findByText(
				"Enter your email address and the confirmation code we emailed you."
			)
		).toBeInTheDocument();
		const email = screen.getByLabelText("Email address", {
			selector: "input",
		});
		expect(email).toHaveValue("");

		await userEvent.click(
			screen.getByRole("button", { name: "Send another code" })
		);
		await userEvent.type(
			screen.getByLabelText("Confirmation code", { selector: "input" }),
			"123456"
		);
		await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

		expect(email).toHaveAccessibleDescription(expect.any(String));
		expect(calls).toHaveLength(0);

		await userEvent.type(email, "jose@acme.test");
		await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith({
				to: "/sign-in",
				search: { email: "jose@acme.test" },
			});
		});
		expect(calls[0]?.body).toEqual({ email: "jose@acme.test", code: "123456" });
	});

	it("lets the person correct an address prefilled from the link", async () => {
		const calls = stubApi({
			"POST /api/v1/public/sign-up-confirmation-codes": { status: 202 },
		});
		renderAuthPage(<ConfirmEmailPage />, entry);

		const email = await screen.findByLabelText("Email address", {
			selector: "input",
		});
		expect(email).toHaveValue("jose@acme.test");
		await userEvent.clear(email);
		await userEvent.type(email, "josefina@acme.test");
		await userEvent.click(
			screen.getByRole("button", { name: "Send another code" })
		);

		await waitFor(() => {
			expect(calls[0]?.body).toEqual({ email: "josefina@acme.test" });
		});
	});
});
