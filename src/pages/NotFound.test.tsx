import { render, screen } from "@testing-library/react";
import { RouterProvider } from "@tanstack/react-router";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import { createMemoryRouter } from "@/common/createMemoryRouter";
import {
	currentUserReply,
	openApp,
	signedInShellRoutes,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	accessPassReply,
	problemReply,
	stubApi,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import { authTestI18n } from "@/features/auth/testingI18n";
import { SignedOutNotFound } from "@/pages/SignedOutNotFound";

let app: OpenedApp | undefined;
beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
	app?.disconnect();
	app?.queryClient.clear();
	app = undefined;
	endSession("expired");
	resetApiClient();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	localStorage.clear();
});

const open = async (entry: string): Promise<void> => {
	app = await openApp(entry);
	renderAuthApp(app);
};

describe("an address the app doesn't have", () => {
	it("says so inside the signed-in shell, with the menu and a way to the dashboard", async () => {
		stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			...signedInShellRoutes(),
		});
		await open("/no-such-page");

		expect(
			await screen.findByText("This page doesn’t exist.")
		).toBeInTheDocument();
		expect(
			screen.getByRole("navigation", { name: "Main navigation" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Go to the dashboard" })
		).toHaveAttribute("href", "/");
	});

	it("sends someone signed out to sign in", async () => {
		stubApi({
			"POST /api/v1/public/sessions/refreshes": problemReply(
				401,
				"SESSION_EXPIRED"
			),
		});
		await open("/no-such-page");

		await vi.waitFor(() => {
			expect(app?.router.state.location.pathname).toBe("/login");
		});
	});

	it("offers signing in where no route answers outside the app", async () => {
		// The sign-in layout asks whether motion is reduced.
		vi.stubGlobal("matchMedia", () => ({
			matches: false,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}));
		const router = createMemoryRouter(<SignedOutNotFound />);
		await router.load();
		render(
			<I18nextProvider i18n={authTestI18n}>
				<RouterProvider router={router} />
			</I18nextProvider>
		);

		expect(
			await screen.findByText("This page doesn’t exist.")
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
			"href",
			"/login"
		);
	});
});
