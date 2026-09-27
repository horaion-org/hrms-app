import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as Router from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignInPage } from "@/features/auth/SignInPage";
import { renderAuthPage } from "@/features/auth/testing";

const navigate = vi.hoisted(() => vi.fn());
const signIn = vi.hoisted(() => vi.fn());

vi.mock(
	"@tanstack/react-router",
	async (importOriginal): Promise<typeof Router> => ({
		...(await importOriginal<typeof Router>()),
		useNavigate: () => navigate,
	})
);
vi.mock("@/features/auth/cognito", () => ({ signIn }));

beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.stubGlobal("matchMedia", () => ({ matches: true }));
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	navigate.mockReset();
	signIn.mockReset();
});

const submit = async (remember = true): Promise<void> => {
	const user = userEvent.setup();
	await user.type(
		await screen.findByLabelText("Email", { selector: "input" }),
		"jose@acme.test"
	);
	await user.type(
		screen.getByLabelText("Password", { selector: "input" }),
		"Str0ng!pass"
	);
	if (!remember) {
		await user.click(screen.getByRole("checkbox", { name: "Remember me" }));
	}
	await user.click(screen.getByRole("button", { name: "Sign in" }));
};

describe("SignInPage", () => {
	it.each([
		[{ status: "SIGNED_IN" }, { to: "/" }],
		[{ status: "NEW_PASSWORD_REQUIRED" }, { to: "/new-password" }],
		[
			{ status: "UNCONFIRMED" },
			{ to: "/confirm-email", search: { email: "jose@acme.test" } },
		],
	])("routes the %o outcome", async (outcome, destination) => {
		signIn.mockResolvedValue(outcome);
		renderAuthPage(<SignInPage />);

		await submit();

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith(destination);
		});
		expect(signIn).toHaveBeenCalledWith("jose@acme.test", "Str0ng!pass", true);
	});

	it("passes an unticked Remember me through", async () => {
		signIn.mockResolvedValue({ status: "SIGNED_IN" });
		renderAuthPage(<SignInPage />);

		await submit(false);

		await waitFor(() => {
			expect(signIn).toHaveBeenCalledWith(
				"jose@acme.test",
				"Str0ng!pass",
				false
			);
		});
	});

	it("shows Cognito's refusal on the password field", async () => {
		signIn.mockRejectedValue(new Error("Incorrect username or password."));
		renderAuthPage(<SignInPage />);

		await submit();

		expect(
			await screen.findByLabelText("Password", { selector: "input" })
		).toHaveAccessibleDescription("Incorrect username or password.");
		expect(navigate).not.toHaveBeenCalled();
	});

	it("validates before calling Cognito", async () => {
		renderAuthPage(<SignInPage />);

		await userEvent.click(
			await screen.findByRole("button", { name: "Sign in" })
		);

		expect(
			screen.getByLabelText("Email", { selector: "input" })
		).toHaveAccessibleDescription("This field is required");
		expect(signIn).not.toHaveBeenCalled();
	});

	it("links to sign-up and password help", async () => {
		renderAuthPage(<SignInPage />);

		expect(await screen.findByRole("link", { name: "Signup" })).toHaveAttribute(
			"href",
			"/sign-up"
		);
		expect(
			screen.getByRole("link", { name: "Having trouble signing in?" })
		).toHaveAttribute("href", "/forgot-password");
	});
});
