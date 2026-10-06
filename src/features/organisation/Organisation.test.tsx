import { screen, waitFor, within } from "@testing-library/react";
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
const BRANCHES = "GET /api/v1/companies/c-1/branches";
const DEPARTMENTS = "GET /api/v1/companies/c-1/departments";
const ACCESS_ROLES = "GET /api/v1/companies/c-1/access-roles";
const JOB_TITLES = "GET /api/v1/companies/c-1/job-titles";
const AUDIT_EVENTS = "GET /api/v1/companies/c-1/audit-events";
const EVERY_PERMISSION = [
	"branch:read",
	"department:read",
	"job_title:read",
	"access_role:read",
	"audit_event:read",
];

let app: OpenedApp | undefined;
beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-03T12:00:00Z") });
});
afterEach(() => {
	app?.disconnect();
	app?.queryClient.clear();
	app = undefined;
	endSession("expired");
	resetApiClient();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	localStorage.clear();
});

const open = async (entry = "/organisation"): Promise<OpenedApp> => {
	app = await openApp(entry);
	renderAuthApp(app);
	return app;
};

const workspaceReply = (permissions: Array<string>): StubReply => ({
	status: 200,
	body: envelope({
		companies: [
			{ uuid: "c-1", name: "Company c-1", permissions, branches: [] },
		],
	}),
});

const totalReply = (totalElements: number): StubReply => ({
	status: 200,
	body: envelope({ content: [], page: { totalElements } }),
});

const auditEvent = (
	overrides: Record<string, string | null>
): Record<string, string | null> => ({
	auditEventId: "e-1",
	action: "branch.create",
	entityType: "Branch",
	entityId: "b-1",
	entityName: "Orchard",
	actorDisplayName: "Aisha Rahman",
	occurredAt: "2026-10-03T10:00:00Z",
	...overrides,
});

const activityReply = (
	events: Array<Record<string, string | null>>
): StubReply => ({
	status: 200,
	body: envelope({ content: events, page: { totalElements: events.length } }),
});

const card = (name: string): HTMLElement =>
	screen.getByRole("region", { name });
const findCard = (name: string): Promise<HTMLElement> =>
	screen.findByRole("region", { name });

it("shows the overview figures and recent activity for the current company", async () => {
	const calls = stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: workspaceReply(EVERY_PERMISSION),
		[BRANCHES]: totalReply(2),
		[DEPARTMENTS]: totalReply(1234),
		[ACCESS_ROLES]: totalReply(4),
		[JOB_TITLES]: totalReply(12),
		[AUDIT_EVENTS]: activityReply([
			auditEvent({}),
			auditEvent({
				auditEventId: "e-2",
				action: "department.update",
				entityType: "Department",
				entityName: "Front Office",
				actorDisplayName: "Ethan Wong",
				occurredAt: "2026-10-02T09:00:00Z",
			}),
			auditEvent({
				auditEventId: "e-3",
				action: "access_role.delete",
				entityType: "AccessRole",
				entityName: null,
				actorDisplayName: null,
				occurredAt: "2026-10-03T11:59:40Z",
			}),
			auditEvent({
				auditEventId: "e-4",
				action: "job_title.create",
				entityType: "JobTitle",
				entityName: "Shift supervisor",
				actorDisplayName: "Ethan Wong",
				occurredAt: "2026-10-03T11:00:00Z",
			}),
		]),
	});
	await open();

	expect(
		await screen.findByRole("heading", {
			level: 1,
			name: "Organisation Overview",
		})
	).toBeVisible();
	expect(
		await within(await findCard("Branches")).findByText("2")
	).toBeVisible();
	expect(within(card("Branches")).getByText("Active Branches")).toBeVisible();
	expect(await within(card("Departments")).findByText("1,234")).toBeVisible();
	expect(await within(card("System roles")).findByText("4")).toBeVisible();
	expect(await within(card("Job titles")).findByText("12")).toBeVisible();
	expect(
		within(card("Job titles")).getByText("Active job titles")
	).toBeVisible();

	const activity = screen.getByRole("region", { name: "Recent Activity" });
	const items = await within(activity).findAllByRole("listitem");
	expect(items.map((item) => item.textContent)).toEqual([
		"Branch created: Orchardby Aisha Rahman•2 hours ago",
		"Department updated: Front Officeby Ethan Wong•Yesterday",
		"Role deletedJust now",
		"Job title created: Shift supervisorby Ethan Wong•1 hour ago",
	]);
	expect(
		within(items[0] as HTMLElement).getByText("2 hours ago")
	).toHaveAttribute("dateTime", "2026-10-03T10:00:00Z");

	const searchOf = (path: string): string | undefined =>
		calls.find((call) => call.path === path)?.search;
	expect(searchOf("/api/v1/companies/c-1/branches")).toBe(
		"status=ACTIVE&size=1"
	);
	expect(searchOf("/api/v1/companies/c-1/departments")).toBe(
		"status=ACTIVE&size=1"
	);
	expect(searchOf("/api/v1/companies/c-1/access-roles")).toBe("size=1");
	expect(searchOf("/api/v1/companies/c-1/job-titles")).toBe(
		"status=ACTIVE&size=1"
	);
	expect(searchOf("/api/v1/companies/c-1/audit-events")).toBe(
		"size=4&entityType=Branch&entityType=Department&entityType=AccessRole&entityType=JobTitle"
	);
});

it("hides what the workspace does not grant and never asks for it", async () => {
	const calls = stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: workspaceReply(["branch:read"]),
		[BRANCHES]: totalReply(3),
	});
	await open();

	expect(
		await within(await findCard("Branches")).findByText("3")
	).toBeVisible();
	for (const name of ["Departments", "Job titles", "System roles"])
		expect(screen.queryByRole("region", { name })).not.toBeInTheDocument();
	expect(
		screen.queryByRole("region", { name: "Recent Activity" })
	).not.toBeInTheDocument();
	expect(
		calls
			.map((call) => call.path)
			.filter((path) => path.startsWith("/api/v1/companies/"))
	).toEqual(["/api/v1/companies/c-1/branches"]);
});

it("shows the unit counts to a person granted only at one branch", async () => {
	const calls = stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: {
			status: 200,
			body: envelope({
				companies: [
					{
						uuid: "c-1",
						name: "Company c-1",
						permissions: [],
						branches: [
							{
								uuid: "b-1",
								name: "Orchard",
								permissions: ["branch:read", "department:read"],
								departments: [],
							},
						],
					},
				],
			}),
		},
		[BRANCHES]: totalReply(1),
		[DEPARTMENTS]: totalReply(2),
	});
	await open();

	expect(
		await within(await findCard("Branches")).findByText("1")
	).toBeVisible();
	expect(
		await within(await findCard("Departments")).findByText("2")
	).toBeVisible();
	// Roles and the activity feed have no unit, so a branch grant doesn't reach them.
	for (const name of ["System roles", "Recent Activity"])
		expect(screen.queryByRole("region", { name })).not.toBeInTheDocument();
	expect(
		calls
			.map((call) => call.path)
			.filter((path) => path.startsWith("/api/v1/companies/"))
	).toEqual([
		"/api/v1/companies/c-1/branches",
		"/api/v1/companies/c-1/departments",
	]);
});

it("reads permissions only from the current company", async () => {
	const calls = stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: {
			status: 200,
			body: envelope({
				companies: [
					{
						uuid: "other",
						name: "Other",
						permissions: EVERY_PERMISSION,
						branches: [],
					},
				],
			}),
		},
	});
	const opened = await open();

	await waitFor(() => {
		expect(opened.queryClient.getQueryState(["workspace"])?.status).toBe(
			"success"
		);
	});
	expect(
		await screen.findByRole("heading", { name: "Organisation Overview" })
	).toBeVisible();
	expect(screen.queryByRole("region")).not.toBeInTheDocument();
	expect(calls.some((call) => call.path.startsWith("/api/v1/companies/"))).toBe(
		false
	);
});

it("keeps a refused figure unknown and reports a failed activity load", async () => {
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: workspaceReply(EVERY_PERMISSION),
		[BRANCHES]: problemReply(403, "AUTHORIZATION_DENIED"),
		[DEPARTMENTS]: totalReply(0),
		[ACCESS_ROLES]: totalReply(1),
		[AUDIT_EVENTS]: problemReply(403, "AUTHORIZATION_DENIED"),
	});
	await open();

	expect(
		await screen.findByText("We couldn’t load recent activity.")
	).toHaveAttribute("role", "alert");
	expect(await within(card("Departments")).findByText("0")).toBeVisible();
	expect(within(card("Branches")).getByText("—")).toBeVisible();
});

it("says so when there is no recent activity", async () => {
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: workspaceReply(["audit_event:read"]),
		[AUDIT_EVENTS]: activityReply([]),
	});
	await open();

	expect(await screen.findByText("No recent activity yet.")).toBeVisible();
});

it("explains when the workspace cannot be loaded", async () => {
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		[WORKSPACE]: problemReply(403, "AUTHORIZATION_DENIED"),
	});
	await open();

	expect(
		await screen.findByText(
			"We couldn’t load your organisation details. Please try again."
		)
	).toHaveAttribute("role", "alert");
	expect(screen.queryByRole("region")).not.toBeInTheDocument();
});

it("reaches the overview from the Sidebar and marks Organisation current", async () => {
	stubApi({
		[REFRESH]: accessPassReply(),
		[ME]: currentUserReply(),
		// People is offered only with its own key.
		[WORKSPACE]: workspaceReply(["branch:read", "member_profile:read"]),
	});
	const opened = await open("/");
	const user = userEvent.setup();
	const navigation = await screen.findByRole("navigation", {
		name: "Main navigation",
	});

	// Organisation is offered once the workspace says it may be.
	await within(navigation).findByRole("link", { name: "Organisation" });
	expect(
		within(navigation)
			.getAllByRole("link")
			.map((link) => link.textContent)
	).toEqual(["Dashboard", "Scheduling", "Leave", "People", "Organisation"]);
	expect(screen.getByRole("heading", { name: "Dashboard" })).toBeVisible();
	await user.click(
		within(navigation).getByRole("link", { name: "Organisation" })
	);

	expect(
		await screen.findByRole("heading", { name: "Organisation Overview" })
	).toBeVisible();
	expect(opened.router.state.location.pathname).toBe("/organisation");
	expect(
		within(navigation).getByRole("link", { name: "Organisation" })
	).toHaveAttribute("aria-current", "page");
	expect(
		within(navigation).getByRole("link", { name: "Dashboard" })
	).not.toHaveAttribute("aria-current");
	const banner = screen.getByRole("banner");
	expect(banner).toHaveTextContent("Welcome, José.");
	expect(within(banner).getByRole("img", { name: "José" })).toHaveTextContent(
		"J"
	);
});
