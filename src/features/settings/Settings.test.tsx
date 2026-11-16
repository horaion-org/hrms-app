import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import { SuccessNotifications } from "@/common/SuccessNotifications";
import {
	currentUserReply,
	membership,
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
import { CURRENT_COMPANY_KEY } from "@/features/auth/currentCompany";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import { authTestI18n } from "@/features/auth/testingI18n";

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
	companies: Array<{ uuid: string; name: string; permissions?: Array<string> }>
): StubReply => ({
	status: 200,
	body: envelope({
		companies: companies.map((company) => ({
			permissions: [],
			...company,
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
	const sections = screen.getByRole("navigation", {
		name: "Settings sections",
	});
	expect(
		within(sections)
			.getAllByRole("link")
			.map((link) => [link.getAttribute("aria-current"), link.textContent])
	).toEqual([
		["page", "General"],
		[null, "Notifications"],
		[null, "Plan and billing"],
	]);
	// Only the groups with something offered are listed.
	expect(within(sections).getAllByRole("list")).toHaveLength(2);
	expect(within(sections).getByRole("list", { name: "Workspace" })).toBeVisible();
	expect(within(sections).getByRole("list", { name: "Account" })).toBeVisible();

	const general = screen.getByRole("region", { name: "General" });
	expect(
		within(general).getByRole("heading", { level: 2, name: "General" })
	).toBeVisible();
	expect(general).toHaveTextContent(
		"Workspace name, language, time zone and date format."
	);
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
	// No company:update in this workspace, so the name is shown read-only.
	expect(
		within(general).getByRole("textbox", { name: "Workspace Name" })
	).toBeDisabled();
	expect(
		within(general).queryByRole("button", { name: "Save Changes" })
	).not.toBeInTheDocument();
	expect(
		calls.filter((call) => call.path === "/api/v1/me/workspace")
	).toHaveLength(1);
});

it("offers Access roles to people who may read roles, as a link to their own page", async () => {
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: workspaceReply([
			{ uuid: "c-1", name: "Horaion", permissions: ["access_role:read"] },
		]),
	});
	await open();

	const sections = await screen.findByRole("navigation", {
		name: "Settings sections",
	});
	expect(
		within(sections).getByRole("list", { name: "Access and data" })
	).toHaveTextContent("Access roles");
	expect(
		within(sections).getByRole("link", { name: "Access roles" })
	).toHaveAttribute("href", "/settings/access-roles");
});

it("sends the old Access roles address to the roles page", async () => {
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: workspaceReply([{ uuid: "c-1", name: "Horaion" }]),
	});
	const opened = await open("/settings?section=access");

	await waitFor(() => {
		expect(opened.router.state.location.pathname).toBe("/settings/access-roles");
	});
});

it("leaves Access roles out without the key to read roles", async () => {
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: workspaceReply([{ uuid: "c-1", name: "Horaion" }]),
	});
	await open();

	await screen.findByRole("navigation", { name: "Settings sections" });
	expect(
		screen.queryByRole("link", { name: "Access roles" })
	).not.toBeInTheDocument();
});

it("opens one section at a time from its link, marking it current", async () => {
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: workspaceReply([{ uuid: "c-1", name: "Horaion" }]),
	});
	const opened = await open();
	const user = userEvent.setup();
	await screen.findByRole("textbox", { name: "Workspace Name" });

	await user.click(screen.getByRole("link", { name: "Notifications" }));
	const notifications = await screen.findByRole("region", {
		name: "Notifications",
	});
	expect(
		within(notifications).getByRole("heading", { name: "Notifications" })
	).toBeVisible();
	expect(notifications).toHaveTextContent("These settings are coming soon.");
	expect(screen.getByRole("link", { name: "Notifications" })).toHaveAttribute(
		"aria-current",
		"page"
	);
	expect(
		screen.queryByRole("textbox", { name: "Workspace Name" })
	).not.toBeInTheDocument();
	expect(opened.router.state.location.search).toEqual({
		section: "notifications",
	});

	// Without scheduling_policy:read or leave_type:read neither entry is offered.
	expect(screen.queryByRole("link", { name: "Work policy" })).toBeNull();
	expect(screen.queryByRole("link", { name: "Leave types" })).toBeNull();

	await user.click(screen.getByRole("link", { name: "Plan and billing" }));
	const plan = await screen.findByRole("region", { name: "Plan and billing" });
	expect(plan).toHaveTextContent("Free plan");
	expect(plan).toHaveTextContent("Billing details");
});

it("opens Plan and billing from Upgrade plan and moves focus to it", async () => {
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: workspaceReply([{ uuid: "c-1", name: "Horaion" }]),
	});
	await open();
	const user = userEvent.setup();

	await user.click(await screen.findByRole("button", { name: "Upgrade plan" }));
	const plan = await screen.findByRole("region", { name: "Plan and billing" });
	await waitFor(() => {
		expect(plan).toHaveFocus();
	});
});

it("shows the list alone on a phone until a section is chosen, then the section with a link back", async () => {
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: workspaceReply([{ uuid: "c-1", name: "Horaion" }]),
	});
	await open();

	// jsdom applies no styles, so the breakpoint classes stand in for what a phone shows.
	const list = await screen.findByRole("navigation", {
		name: "Settings sections",
	});
	expect(list).not.toHaveClass("max-md:hidden");
	expect(screen.getByRole("region", { name: "General" })).toHaveClass(
		"max-md:hidden"
	);

	await userEvent.click(within(list).getByRole("link", { name: "Notifications" }));
	const panel = await screen.findByRole("region", { name: "Notifications" });
	expect(panel).not.toHaveClass("max-md:hidden");
	expect(list).toHaveClass("max-md:hidden");
	const back = within(screen.getByRole("main")).getByRole("link", {
		name: "Settings",
	});
	expect(back).toHaveAttribute("href", "/settings");
	expect(back).toHaveClass("md:hidden");
	expect(back).not.toHaveAttribute("aria-current");
});

it("opens Leave types from the old Leave address, without the durations", async () => {
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: workspaceReply([
			{ uuid: "c-1", name: "Horaion", permissions: ["leave_type:read"] },
		]),
		"GET /api/v1/companies/c-1/leave-types": {
			status: 200,
			body: envelope([]),
		},
	});
	await open("/settings?section=leave");

	const panel = await screen.findByRole("region", { name: "Leave types" });
	expect(
		await within(panel).findByRole("heading", { name: "Leave types" })
	).toBeVisible();
	expect(
		within(panel).queryByRole("heading", { name: "Leave durations" })
	).toBeNull();
	expect(
		within(screen.getByRole("list", { name: "Leave" }))
			.getAllByRole("link")
			.map((link) => link.textContent)
	).toEqual(["Leave types"]);
});

it("opens Leave durations on its own entry", async () => {
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: workspaceReply([
			{
				uuid: "c-1",
				name: "Horaion",
				permissions: ["leave_type:read", "leave_duration:read"],
			},
		]),
		"GET /api/v1/companies/c-1/leave-durations": {
			status: 200,
			body: envelope([]),
		},
	});
	await open("/settings?section=leave-durations");

	const panel = await screen.findByRole("region", { name: "Leave durations" });
	expect(
		await within(panel).findByRole("heading", { name: "Leave durations" })
	).toBeVisible();
	expect(
		within(panel).queryByRole("heading", { name: "Leave types" })
	).toBeNull();
	expect(
		within(screen.getByRole("list", { name: "Leave" }))
			.getAllByRole("link")
			.map((link) => link.textContent)
	).toEqual(["Leave types", "Leave durations"]);
});

it("shows someone who manages only leave durations just that entry, also from the old Leave address", async () => {
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: workspaceReply([
			{
				uuid: "c-1",
				name: "Horaion",
				permissions: ["leave_duration:read"],
			},
		]),
		"GET /api/v1/companies/c-1/leave-durations": {
			status: 200,
			body: envelope([]),
		},
	});
	await open("/settings?section=leave");

	const panel = await screen.findByRole("region", { name: "Leave durations" });
	expect(
		await within(panel).findByRole("heading", { name: "Leave durations" })
	).toBeVisible();
	expect(
		within(screen.getByRole("list", { name: "Leave" }))
			.getAllByRole("link")
			.map((link) => [link.textContent, link.getAttribute("aria-current")])
	).toEqual([["Leave durations", "page"]]);
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
	expect(screen.getByRole("link", { name: "Notifications" })).toBeVisible();
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
	// The greeting is the dashboard's alone, and Settings lists nothing by Branch.
	expect(screen.getByRole("banner")).not.toHaveTextContent("Welcome");
	expect(
		within(screen.getByRole("banner")).queryByText("Branch")
	).not.toBeInTheDocument();
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

describe("workspace name", () => {
	const RENAME = "PUT /api/v1/companies/c-1";

	/** The app-level toast queue, which `renderAuthApp` leaves out. */
	const renderToasts = ({ queryClient }: OpenedApp): void => {
		render(
			<I18nextProvider i18n={authTestI18n}>
				<QueryClientProvider client={queryClient}>
					<SuccessNotifications />
				</QueryClientProvider>
			</I18nextProvider>
		);
	};

	it("renames the company, confirms it and reloads the workspace", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			[REFRESH]: accessPassReply(),
			[ME]: currentUserReply(),
			[WORKSPACE]: [
				workspaceReply([
					{ uuid: "c-1", name: "Horaion", permissions: ["company:update"] },
				]),
				workspaceReply([
					{
						uuid: "c-1",
						name: "Prospect Protection",
						permissions: ["company:update"],
					},
				]),
			],
			[RENAME]: {
				status: 200,
				body: envelope({ companyId: "c-1", name: "Prospect Protection" }),
			},
		});
		renderToasts(await open());
		const name = await screen.findByRole("textbox", { name: "Workspace Name" });
		const save = screen.getByRole("button", { name: "Save Changes" });
		expect(save).toBeDisabled();

		await user.clear(name);
		await user.type(name, "  Prospect   Protection ");
		await user.click(save);

		expect(await screen.findByRole("status")).toHaveTextContent(
			"Workspace name saved."
		);
		expect(
			calls.filter((call) => `${call.method} ${call.path}` === RENAME)
		).toEqual([
			expect.objectContaining({ body: { name: "Prospect   Protection" } }),
		]);
		expect(name).toHaveValue("Prospect Protection");
		expect(save).toBeDisabled();
		await waitFor(() => {
			expect(
				calls.filter((call) => call.path === "/api/v1/me/workspace")
			).toHaveLength(2);
		});
	});

	it("shows the new name in the company switcher without a reload", async () => {
		const user = userEvent.setup();
		// The picker's AuthLayout asks whether motion is reduced.
		vi.stubGlobal("matchMedia", () => ({ matches: true }));
		const otherCompany = membership("c-2");
		const calls = stubApi({
			[REFRESH]: accessPassReply(),
			[ME]: [
				currentUserReply([
					{ ...membership("c-1"), companyName: "Horaion" },
					otherCompany,
				]),
				currentUserReply([
					{ ...membership("c-1"), companyName: "Prospect Protection" },
					otherCompany,
				]),
			],
			[WORKSPACE]: workspaceReply([
				{ uuid: "c-1", name: "Horaion", permissions: ["company:update"] },
				{ uuid: "c-2", name: "Company c-2" },
			]),
			[RENAME]: {
				status: 200,
				body: envelope({ companyId: "c-1", name: "Prospect Protection" }),
			},
		});
		localStorage.setItem(CURRENT_COMPANY_KEY, "c-1");
		await open();
		const name = await screen.findByRole("textbox", { name: "Workspace Name" });

		await user.clear(name);
		await user.type(name, "Prospect Protection");
		await user.click(screen.getByRole("button", { name: "Save Changes" }));
		// The name lives in /me too, which is read once per session: it is read again.
		await waitFor(() => {
			expect(calls.filter((call) => call.path === "/api/v1/me")).toHaveLength(
				2
			);
		});
		await user.click(screen.getByRole("button", { name: "Switch company" }));

		expect(
			await screen.findByRole("button", { name: "Prospect Protection c-1" })
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Horaion c-1" })
		).not.toBeInTheDocument();
	});

	it("shows the name read-only, with the reason, without permission to update the company", async () => {
		const calls = stubApi({
			[REFRESH]: accessPassReply(),
			[ME]: currentUserReply(),
			[WORKSPACE]: workspaceReply([
				{ uuid: "c-1", name: "Horaion", permissions: ["company:read"] },
			]),
		});
		await open();

		expect(
			await screen.findByRole("textbox", { name: "Workspace Name" })
		).toBeDisabled();
		expect(
			screen.getByText(
				"Only people who can update the company can rename the workspace."
			)
		).toBeVisible();
		expect(
			screen.queryByRole("button", { name: "Save Changes" })
		).not.toBeInTheDocument();
		expect(calls.some((call) => call.method === "PUT")).toBe(false);
	});

	it("explains a refusal of permission on save", async () => {
		const user = userEvent.setup();
		stubApi({
			[REFRESH]: accessPassReply(),
			[ME]: currentUserReply(),
			[WORKSPACE]: workspaceReply([
				{ uuid: "c-1", name: "Horaion", permissions: ["company:update"] },
			]),
			[RENAME]: problemReply(403, "AUTHORIZATION_DENIED"),
		});
		await open();
		const name = await screen.findByRole("textbox", { name: "Workspace Name" });

		await user.clear(name);
		await user.type(name, "Acme");
		await user.click(screen.getByRole("button", { name: "Save Changes" }));

		expect(
			await screen.findByText(
				"You no longer have permission to rename this workspace."
			)
		).toHaveAttribute("role", "alert");
	});
});
