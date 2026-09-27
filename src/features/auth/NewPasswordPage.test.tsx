import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as Router from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewPasswordPage } from "@/features/auth/NewPasswordPage";
import { renderAuthPage } from "@/features/auth/testing";

const navigate = vi.hoisted(() => vi.fn());
const completeNewPassword = vi.hoisted(() => vi.fn());
const hasPendingPasswordChallenge = vi.hoisted(() => vi.fn());

vi.mock(
	"@tanstack/react-router",
	async (importOriginal): Promise<typeof Router> => ({
		...(await importOriginal<typeof Router>()),
		useNavigate: () => navigate,
	})
);
vi.mock("@/features/auth/cognito", () => ({
	completeNewPassword,
	hasPendingPasswordChallenge,
}));

beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.stubGlobal("matchMedia", () => ({ matches: true }));
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	navigate.mockReset();
	completeNewPassword.mockReset();
	hasPendingPasswordChallenge.mockReset();
});

describe("NewPasswordPage", () => {
	it("answers the challenge and continues into the app", async () => {
		hasPendingPasswordChallenge.mockReturnValue(true);
		completeNewPassword.mockResolvedValue(undefined);
		renderAuthPage(<NewPasswordPage />);

		await userEvent.type(
			await screen.findByLabelText("New password", { selector: "input" }),
			"N3w!password"
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Set password and continue" })
		);

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith({ to: "/" });
		});
		expect(completeNewPassword).toHaveBeenCalledWith("N3w!password");
	});

	it("sends a person without a challenge back to sign in", async () => {
		hasPendingPasswordChallenge.mockReturnValue(false);
		renderAuthPage(<NewPasswordPage />);

		expect(
			await screen.findByRole("heading", { name: "Nothing to set" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Back to sign in" })
		).toHaveAttribute("href", "/sign-in");
		expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
	});
});
