import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
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

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";

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

const open = async (entry = "/settings"): Promise<OpenedApp> => {
	app = await openApp(entry);
	renderAuthApp(app);
	return app;
};

const workspaceReply = (
	companies: Array<{ uuid: string; name: string }>
): StubReply => ({
	status: 200,
	body: envelope({
		companies: companies.map((company) => ({
			...company,
			permissions: [],
			branches: [],
		})),
	}),
});

it("shows the General settings prefilled with the current company's name", async () => {
	const calls = stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: workspaceReply([
			{ uuid: "other", name: "Other Company" },
			{ uuid: "c-1", name: "Horaion" },
		]),
	});
	await open();

	expect(
		await screen.findByRole("heading", { level: 1, name: "Settings" })
	).toBeVisible();
	expect(
		screen.getByText("Manage your workspace preferences.", {
			selector: "h1 + p",
		})
	).toBeVisible();
	const sections = screen.getByRole("tablist", { name: "Settings sections" });
	expect(sections).toHaveAttribute("aria-orientation", "vertical");
	expect(
		within(sections)
			.getAllByRole("tab")
			.map((tab) => [tab.getAttribute("aria-selected"), tab.textContent])
	).toEqual([
		["true", "General Core workspace preferences."],
		["false", "Notifications Control what you are notified about and how."],
		["false", "Scheduling Configure approval workflows and hierarchies."],
	]);
	expect(
		screen.getByRole("tab", {
			name: "General",
			description: "Core workspace preferences.",
		})
	).toBeVisible();

	const general = screen.getByRole("tabpanel", { name: "General" });
	expect(
		within(general).getByRole("heading", { level: 2, name: "General" })
	).toBeVisible();
	expect(
		await within(general).findByRole("textbox", { name: "Workspace Name" })
	).toHaveValue("Horaion");
	expect(
		within(general).getByRole("button", { name: "Default Language" })
	).toHaveTextContent("English");
	expect(
		within(general).getByRole("button", { name: "Time Zone" })
	).toHaveTextContent("Singapore (GMT +8)");
	expect(
		within(general).getByRole("button", { name: "Date Format" })
	).toHaveTextContent("DD MM YYYY");
	expect(
		within(general).getByRole("button", { name: "Country" })
	).toHaveTextContent("Singapore");
	expect(
		within(general).getByRole("button", { name: "Save Changes" })
	).toBeDisabled();
	expect(within(general).getByRole("button", { name: "Cancel" })).toBeEnabled();
	expect(
		calls.filter((call) => call.path === "/api/v1/me/workspace")
	).toHaveLength(1);
});

it("switches to the coming-soon Notifications and Scheduling sections with the arrow keys", async () => {
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: workspaceReply([{ uuid: "c-1", name: "Horaion" }]),
	});
	await open();
	const user = userEvent.setup();
	const general = await screen.findByRole("tab", { name: "General" });
	await screen.findByRole("textbox", { name: "Workspace Name" });

	await user.click(general);
	await user.keyboard("{ArrowDown}");
	const notifications = screen.getByRole("tabpanel", { name: "Notifications" });
	expect(
		within(notifications).getByRole("heading", { name: "Notifications" })
	).toBeVisible();
	expect(notifications).toHaveTextContent("These settings are coming soon.");
	expect(
		screen.queryByRole("textbox", { name: "Workspace Name" })
	).not.toBeInTheDocument();

	await user.keyboard("{ArrowDown}");
	expect(
		screen.getByRole("tabpanel", { name: "Scheduling" })
	).toHaveTextContent("These settings are coming soon.");

	await user.keyboard("{ArrowDown}");
	expect(
		await screen.findByRole("textbox", { name: "Workspace Name" })
	).toHaveValue("Horaion");
});

it("leaves the workspace name empty when the workspace does not list the current company", async () => {
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: workspaceReply([{ uuid: "other", name: "Other Company" }]),
	});
	await open();

	expect(
		await screen.findByRole("textbox", { name: "Workspace Name" })
	).toHaveValue("");
});

it("explains when the workspace cannot be loaded and shows no form", async () => {
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: problemReply(403, "AUTHORIZATION_DENIED"),
	});
	await open();

	expect(
		await screen.findByText(
			"We couldn’t load your workspace details. Please try again."
		)
	).toHaveAttribute("role", "alert");
	expect(
		screen.queryByRole("textbox", { name: "Workspace Name" })
	).not.toBeInTheDocument();
	expect(screen.getByRole("tab", { name: "Notifications" })).toBeVisible();
});

it("renders inside the app shell without adding a Sidebar entry", async () => {
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: workspaceReply([{ uuid: "c-1", name: "Horaion" }]),
	});
	const opened = await open();

	const navigation = await screen.findByRole("navigation", {
		name: "Main navigation",
	});
	expect(opened.router.state.location.pathname).toBe("/settings");
	expect(
		within(navigation).queryByRole("link", { current: "page" })
	).toBeNull();
	expect(screen.getByRole("banner")).toHaveTextContent("Welcome, José.");
	expect(screen.getByRole("main")).toContainElement(
		screen.getByRole("heading", { level: 1, name: "Settings" })
	);
});

it("opens Settings from the header's settings link", async () => {
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: workspaceReply([{ uuid: "c-1", name: "Horaion" }]),
	});
	await open("/organisation/job-titles");

	const banner = await screen.findByRole("banner");
	await userEvent.click(
		await within(banner).findByRole("link", { name: "Settings" })
	);

	expect(
		await screen.findByRole("heading", { level: 1, name: "Settings" })
	).toBeVisible();
});
