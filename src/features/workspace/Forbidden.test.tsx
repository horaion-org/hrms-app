import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
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
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";

const workspaceReply = (permissions: ReadonlyArray<string>): StubReply => ({
	status: 200,
	body: envelope({
		companies: [
			{ uuid: "c-1", name: "Company c-1", permissions, branches: [] },
		],
	}),
});

const routes = (
	workspace: StubReply = workspaceReply([])
): Record<string, StubReply> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": workspace,
});

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

const open = async (entry: string): Promise<OpenedApp> => {
	app = await openApp(entry);
	renderAuthApp(app);
	return app;
};

const heading = (): Promise<HTMLElement> =>
	screen.findByRole("heading", {
		level: 1,
		name: "You don’t have access to this page",
	});

describe("Forbidden page", () => {
	it("explains the refusal and offers the Overview when there is nowhere to go back to", async () => {
		stubApi(routes());
		await open("/forbidden");

		expect(await heading()).toBeVisible();
		expect(
			screen.getByText(
				"Your roles don’t include this page. If you need it, ask an administrator to change your roles."
			)
		).toBeVisible();
		expect(
			screen.getByRole("link", { name: "Go to Overview" })
		).toHaveAttribute("href", "/");
		expect(
			screen.queryByRole("button", { name: "Go back" })
		).not.toBeInTheDocument();
	});

	it.each([
		["/people/new", "member_profile:create"],
		["/organisation/system-roles/new", "access_role:create"],
		["/activity", "audit_event:read"],
	])("replaces %s with the Forbidden page without %s", async (entry) => {
		stubApi(routes(workspaceReply(["member_profile:read"])));
		const opened = await open(entry);

		expect(await heading()).toBeVisible();
		expect(opened.router.state.location.pathname).toBe("/forbidden");
	});

	it("goes back past the refused page to where the person came from", async () => {
		const user = userEvent.setup();
		stubApi(routes(workspaceReply(["member_profile:read"])));
		const opened = await open("/settings");
		await screen.findByRole("heading", { level: 1, name: "Settings" });

		await opened.router.navigate({ to: "/people/new" });
		await user.click(await screen.findByRole("button", { name: "Go back" }));

		expect(
			await screen.findByRole("heading", { level: 1, name: "Settings" })
		).toBeVisible();
		expect(opened.router.state.location.pathname).toBe("/settings");
	});

	it("opens the page as usual with the key", async () => {
		stubApi(routes(workspaceReply(["audit_event:read"])));
		const opened = await open("/activity");

		expect(
			await screen.findByRole("heading", { level: 1, name: "Recent Activity" })
		).toBeVisible();
		expect(opened.router.state.location.pathname).toBe("/activity");
	});

	it("leaves the page to explain a workspace that failed to load", async () => {
		stubApi(routes(problemReply(500, "INTERNAL_ERROR")));
		const opened = await open("/activity");

		expect(
			await screen.findByRole("heading", { level: 1, name: "Recent Activity" })
		).toBeVisible();
		expect(opened.router.state.location.pathname).toBe("/activity");
	});
});
