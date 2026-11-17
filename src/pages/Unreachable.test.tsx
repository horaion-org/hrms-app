import { render, screen } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import { createMemoryRouter } from "@/common/createMemoryRouter";
import {
	ApiProblemError,
	isDecisionEngineStale,
	UnreachableError,
} from "@/common/problem";
import { queryClient as appQueryClient } from "@/common/query-client";
import { companyWideWorkspace } from "@/common/testing/effectiveWorkspace";
import {
	currentUserReply,
	openApp,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	accessPassReply,
	envelope,
	problemReply,
	stubApi,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import { authTestI18n } from "@/features/auth/testingI18n";
import { Unreachable } from "@/pages/Unreachable";

/*
 * A page opened just after an organisation change: its loader's workspace
 * read is refused with 503 DECISION_ENGINE_STALE until the API's access
 * rules catch up. The app's query defaults retry it; `Retry-After: 0` keeps
 * the test quick.
 */

const STALE = problemReply(503, "DECISION_ENGINE_STALE", { "Retry-After": "0" });
const WORKSPACE = "GET /api/v1/me/workspace";
const workspaceReply = {
	status: 200,
	body: envelope(companyWideWorkspace(["member_profile:create"])),
};

let app: OpenedApp | undefined;
beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	// The sign-in layout asks whether motion is reduced.
	vi.stubGlobal("matchMedia", () => ({
		matches: false,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	}));
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

/** Opens the people import, whose loader reads the workspace, with the app's own query defaults. */
const openImport = async (): Promise<void> => {
	app = await openApp(
		"/settings/data/import-people",
		new QueryClient({ defaultOptions: appQueryClient.getDefaultOptions() })
	);
	renderAuthApp(app);
};

describe("a page opened while access is updated", () => {
	it("opens once the workspace read passes on a retry", async () => {
		stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			[WORKSPACE]: [STALE, workspaceReply],
		});
		await openImport();

		expect(
			await screen.findByRole("heading", { level: 1, name: "Import people" })
		).toBeInTheDocument();
	});

	it("fails the page with the stale refusal once the retries are used up, not as an outage", async () => {
		const calls = stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			[WORKSPACE]: STALE,
		});
		await openImport();

		const matches: ReadonlyArray<{ status: string; error: unknown }> =
			app?.router.state.matches ?? [];
		const page = matches[matches.length - 1];
		expect(page?.status).toBe("error");
		expect(isDecisionEngineStale(page?.error)).toBe(true);
		// The import's loader asked three times: once, then two retries.
		expect(calls.filter((call) => call.path === "/api/v1/me/workspace").length).toBeGreaterThanOrEqual(3);
	});
});

describe("Unreachable", () => {
	/** Renders the error screen for `error`, as the signed-in routes show it. */
	const renderFor = async (error: Error): Promise<void> => {
		const router = createMemoryRouter(<Unreachable error={error} />);
		await router.load();
		render(
			<I18nextProvider i18n={authTestI18n}>
				<RouterProvider router={router} />
			</I18nextProvider>
		);
	};

	it("says access is being updated, with Try again, for the stale refusal", async () => {
		await renderFor(new ApiProblemError({
			message: "API request refused",
			status: 503,
			errorCode: "DECISION_ENGINE_STALE",
			fieldErrors: [],
			retryAfterSeconds: 5,
			reason: "http",
		}));

		expect(
			await screen.findByRole("heading", { name: "Access is being updated" })
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
		expect(screen.queryByText("We can't reach Horaion")).not.toBeInTheDocument();
	});

	it("still says Horaion can't be reached for a real outage", async () => {
		await renderFor(new UnreachableError("API could not be reached"));

		expect(
			await screen.findByRole("heading", { name: "We can't reach Horaion" })
		).toBeInTheDocument();
	});
});
