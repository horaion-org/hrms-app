import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as Router from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { SignUpPage } from "@/features/auth/SignUpPage";
import { renderAuthPage } from "@/features/auth/testing";

const navigate = vi.hoisted(() => vi.fn());
const createOnboarding = vi.hoisted(() => vi.fn());

vi.mock(
	"@tanstack/react-router",
	async (importOriginal): Promise<typeof Router> => ({
		...(await importOriginal<typeof Router>()),
		useNavigate: () => navigate,
	})
);
vi.mock("@/features/auth/api", () => ({ createOnboarding }));

beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.stubGlobal("matchMedia", () => ({ matches: true }));
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	navigate.mockReset();
	createOnboarding.mockReset();
});

const fill = async (
	overrides: Partial<Record<string, string>> = {}
): Promise<void> => {
	const user = userEvent.setup();
	const values = {
		"Company name": "Acme",
		"Workspace address": "Acme-HQ",
		"Your name": "Jose Rizal",
		"Email address": "jose@acme.test",
		Password: "Str0ng!pass",
		...overrides,
	};
	// Typing is sequential: each field waits for the previous one.
	await Object.entries(values).reduce(async (previous, [label, value]) => {
		await previous;
		if (value !== "") {
			await user.type(
				await screen.findByLabelText(label, { selector: "input" }),
				value
			);
		}
	}, Promise.resolve());
	await user.click(screen.getByRole("button", { name: "Create company" }));
};

describe("SignUpPage", () => {
	it("creates the company and asks for the confirmation code", async () => {
		createOnboarding.mockResolvedValue({ companyId: "c-1" });
		renderAuthPage(<SignUpPage />);

		await fill();

		await waitFor(() => {
			expect(navigate).toHaveBeenCalledWith({
				to: "/confirm-email",
				search: { email: "jose@acme.test" },
			});
		});
		expect(createOnboarding).toHaveBeenCalledWith({
			companyName: "Acme",
			subdomain: "acme-hq",
			displayName: "Jose Rizal",
			email: "jose@acme.test",
			password: "Str0ng!pass",
		});
	});

	it("requires the owner's name, which the API needs", async () => {
		renderAuthPage(<SignUpPage />);

		await fill({ "Your name": "" });

		expect(
			await screen.findByLabelText("Your name", { selector: "input" })
		).toHaveAccessibleDescription("This field is required");
		expect(createOnboarding).not.toHaveBeenCalled();
	});

	it.each([
		["ab", "Use 3–30 lowercase letters"],
		["-acme", "Use 3–30 lowercase letters"],
		["admin", "This address is reserved. Choose another"],
	])("rejects the workspace address %s", async (subdomain, message) => {
		renderAuthPage(<SignUpPage />);

		await fill({ "Workspace address": subdomain });

		expect(
			await screen.findByLabelText("Workspace address", { selector: "input" })
		).toHaveAccessibleDescription(expect.stringContaining(message));
		expect(createOnboarding).not.toHaveBeenCalled();
	});

	it("rejects a password the pool would refuse", async () => {
		renderAuthPage(<SignUpPage />);

		await fill({ Password: "alllowercase1" });

		expect(
			await screen.findByLabelText("Password", { selector: "input" })
		).toHaveAccessibleDescription(
			"Include an uppercase letter, a lowercase letter, a number and a symbol"
		);
		expect(createOnboarding).not.toHaveBeenCalled();
	});

	it("shows a taken workspace address on its field", async () => {
		createOnboarding.mockRejectedValue(
			new ApiProblemError(409, {
				detail: "Subdomain 'acme-hq' is already claimed by another company",
				errorCode: "SUBDOMAIN_ALREADY_TAKEN",
			})
		);
		renderAuthPage(<SignUpPage />);

		await fill();

		expect(
			await screen.findByLabelText("Workspace address", { selector: "input" })
		).toHaveAccessibleDescription(
			"Subdomain 'acme-hq' is already claimed by another company"
		);
		expect(navigate).not.toHaveBeenCalled();
	});

	it.each([
		["PASSWORD_POLICY_VIOLATION", "Password"],
		["IDENTITY_REJECTED", "Email address"],
	])("shows the pool's %s refusal on %s", async (errorCode, label) => {
		createOnboarding.mockRejectedValue(
			new ApiProblemError(400, { detail: "Refused by the pool", errorCode })
		);
		renderAuthPage(<SignUpPage />);

		await fill();

		expect(
			await screen.findByLabelText(label, { selector: "input" })
		).toHaveAccessibleDescription("Refused by the pool");
	});

	it("shows the API's field errors on their fields", async () => {
		createOnboarding.mockRejectedValue(
			new ApiProblemError(400, {
				detail: "Validation failed",
				errors: [{ field: "display_name", message: "must not be blank" }],
			})
		);
		renderAuthPage(<SignUpPage />);

		await fill();

		expect(
			await screen.findByLabelText("Your name", { selector: "input" })
		).toHaveAccessibleDescription("must not be blank");
	});
});
