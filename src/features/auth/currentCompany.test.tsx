import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { resetApiClient } from "@/common/api-client";
import {
	currentUserReply,
	membership,
	openApp,
	settled,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	accessPassReply,
	problemReply,
	stubApi,
	type StubCall,
} from "@/common/testing/stubApi";
import { CURRENT_COMPANY_KEY } from "@/features/auth/currentCompany";
import { endSession } from "@/features/auth/session";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const HOME = "Hello, world!";

const i18n = createInstance();
void i18n.use(initReactI18next).init({
	lng: "en",
	resources: { en: { translation: en } },
});

let app: OpenedApp | undefined;

/** Opens the app at `/` for a person with these Memberships and renders it. */
const openAs = async (
	memberships: Parameters<typeof currentUserReply>[0]
): Promise<{ app: OpenedApp; calls: Array<StubCall> }> => {
	const calls = stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(memberships),
	});
	app = await openApp("/");
	render(
		<I18nextProvider i18n={i18n}>
			<QueryClientProvider client={app.queryClient}>
				<RouterProvider router={app.router} />
			</QueryClientProvider>
		</I18nextProvider>
	);

	return { app, calls };
};

const remembered = (): string | null =>
	window.localStorage.getItem(CURRENT_COMPANY_KEY);

beforeEach(() => {
	vi.stubGlobal("matchMedia", () => ({ matches: true }));
});

afterEach(() => {
	app?.disconnect();
	app = undefined;
	endSession("expired");
	resetApiClient();
	window.localStorage.clear();
	vi.unstubAllGlobals();
});

describe("the Current Company", () => {
	it("is the Company chosen last while it is still active", async () => {
		window.localStorage.setItem(CURRENT_COMPANY_KEY, "c-2");

		await openAs([membership("c-1"), membership("c-2")]);

		expect(await screen.findByText(HOME)).toBeInTheDocument();
		expect(remembered()).toBe("c-2");
	});

	it("is the only active Company when the last one no longer works", async () => {
		window.localStorage.setItem(CURRENT_COMPANY_KEY, "c-2");

		await openAs([
			membership("c-1"),
			membership("c-2", { status: "INACTIVE" }),
			membership("c-3", { companyStatus: "SUSPENDED" }),
		]);

		expect(await screen.findByText(HOME)).toBeInTheDocument();
		expect(remembered()).toBe("c-1");
	});

	it("counts a Company still awaiting verification as active", async () => {
		await openAs([
			membership("c-1", { companyStatus: "PENDING_VERIFICATION" }),
			membership("c-2", { companyStatus: "CLOSED" }),
		]);

		expect(await screen.findByText(HOME)).toBeInTheDocument();
		expect(remembered()).toBe("c-1");
	});

	it("is chosen with the Company picker when there are several", async () => {
		window.localStorage.setItem(CURRENT_COMPANY_KEY, "c-gone");
		const { calls } = await openAs([membership("c-1"), membership("c-2")]);

		expect(
			await screen.findByRole("heading", { name: "Choose a company" })
		).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: /Company c-2/ }));

		expect(await screen.findByText(HOME)).toBeInTheDocument();
		expect(remembered()).toBe("c-2");
		expect(calls.filter((call) => call.path === "/api/v1/me")).toHaveLength(1);
	});

	it("is missing, with a clear message, when no Company is active", async () => {
		await openAs([membership("c-1", { status: "INACTIVE" })]);

		expect(
			await screen.findByRole("heading", { name: "No company to open" })
		).toBeInTheDocument();
		expect(screen.queryByText(HOME)).not.toBeInTheDocument();
		expect(remembered()).toBeNull();
	});
});

describe("loading the current user", () => {
	it("sends a refused person to sign in with a return path", async () => {
		stubApi({
			[REFRESH]: accessPassReply(),
			[ME]: problemReply(401, "UNAUTHENTICATED"),
		});

		app = await openApp("/?tab=2");
		await settled(app.router);

		expect(app.router.state.location.pathname).toBe("/sign-in");
		expect(app.router.state.location.search).toEqual({ redirect: "/?tab=2" });
	});
});
