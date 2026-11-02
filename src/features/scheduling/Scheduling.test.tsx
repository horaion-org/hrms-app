import { screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import {
	currentUserReply,
	openApp,
	type OpenedApp,
} from "@/common/testing/openApp";
import { accessPassReply, envelope, stubApi } from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import {
	generatedScheduleFixture,
	scheduleFixture,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";

let app: OpenedApp | undefined;
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

it("shows API history and links to the saved schedule", async () => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	stubApi({
		"POST /api/v1/public/sessions/refreshes": accessPassReply(),
		"GET /api/v1/me": currentUserReply(),
		"GET /api/v1/me/workspace": {
			status: 200,
			body: envelope(schedulingWorkspace(["schedule:read"])),
		},
		"GET /api/v1/companies/c-1/schedules": {
			status: 200,
			body: envelope({
				content: [scheduleFixture({ name: "API schedule" })],
				page: { hasNext: false },
			}),
		},
	});
	app = await openApp("/scheduling");
	renderAuthApp(app);
	const card = await screen.findByRole("region", { name: "API schedule" });
	expect(within(card).getByText("Draft")).toBeInTheDocument();
	expect(
		within(card).getByText("Main branch › Front Office")
	).toBeInTheDocument();
	expect(
		within(card).getByText("Included shifts").nextElementSibling
	).toHaveTextContent("4");
	expect(
		within(card).getByText("Applied constraints").nextElementSibling
	).toHaveTextContent("3");
	expect(
		within(card).getByText("Include leave").nextElementSibling
	).toHaveTextContent("Yes");
	expect(
		within(card).getByText("Allow open shifts").nextElementSibling
	).toHaveTextContent("No");
	expect(
		within(screen.getByRole("table")).getByText("API schedule")
	).toBeInTheDocument();
	expect(
		within(card).getByRole("link", { name: "View schedule API schedule" })
	).toHaveAttribute("href", expect.stringContaining("departmentId=d-1"));
});

it("labels and tones every API status in the history", async () => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const statuses = [
		{ status: "DRAFT", label: "Draft", background: "bg-neutral-400" },
		{
			status: "GENERATION_REQUESTED",
			label: "Generation requested",
			background: "bg-warning-100",
		},
		{ status: "GENERATED", label: "Generated", background: "bg-success-100" },
		{
			status: "GENERATION_FAILED",
			label: "Generation failed",
			background: "bg-error-100",
		},
	] as const;
	stubApi({
		"POST /api/v1/public/sessions/refreshes": accessPassReply(),
		"GET /api/v1/me": currentUserReply(),
		"GET /api/v1/me/workspace": {
			status: 200,
			body: envelope(schedulingWorkspace(["schedule:read"])),
		},
		"GET /api/v1/companies/c-1/schedules": {
			status: 200,
			body: envelope({
				content: statuses.map(({ status }) => {
					const overrides = { scheduleId: status, name: `${status} schedule` };
					return status === "DRAFT"
						? scheduleFixture(overrides)
						: generatedScheduleFixture({ ...overrides, status });
				}),
				page: { hasNext: false },
			}),
		},
	});
	app = await openApp("/scheduling");
	renderAuthApp(app);
	const history = await screen.findByRole("table", {
		name: "Schedule history",
	});
	for (const { status, label, background } of statuses) {
		const row = within(history).getByRole("row", {
			name: new RegExp(`^${status} schedule`),
		});
		expect(within(row).getByText(label)).toHaveClass(background);
	}
});

it("opens a draft in the wizard and any other schedule's roster, from its card and its history row", async () => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const views = [
		{
			status: "DRAFT",
			href: "/scheduling/new?step=setup&scheduleId=DRAFT&departmentId=d-1",
		},
		{
			status: "GENERATION_REQUESTED",
			href: "/scheduling/GENERATION_REQUESTED?branchId=b-1&departmentId=d-1",
		},
		{
			status: "GENERATED",
			href: "/scheduling/GENERATED?branchId=b-1&departmentId=d-1",
		},
		{
			status: "GENERATION_FAILED",
			href: "/scheduling/GENERATION_FAILED?branchId=b-1&departmentId=d-1",
		},
	] as const;
	stubApi({
		"POST /api/v1/public/sessions/refreshes": accessPassReply(),
		"GET /api/v1/me": currentUserReply(),
		"GET /api/v1/me/workspace": {
			status: 200,
			body: envelope(schedulingWorkspace(["schedule:read"])),
		},
		"GET /api/v1/companies/c-1/schedules": {
			status: 200,
			body: envelope({
				content: views.map(({ status }) => {
					const overrides = { scheduleId: status, name: `${status} schedule` };
					return status === "DRAFT"
						? scheduleFixture(overrides)
						: generatedScheduleFixture({ ...overrides, status });
				}),
				page: { hasNext: false },
			}),
		},
	});
	app = await openApp("/scheduling");
	renderAuthApp(app);
	const history = await screen.findByRole("table", {
		name: "Schedule history",
	});
	for (const { status, href } of views) {
		const name = `View schedule ${status} schedule`;
		const card = screen.getByRole("region", { name: `${status} schedule` });
		const row = within(history).getByRole("row", {
			name: new RegExp(`^${status} schedule`),
		});
		expect(within(card).getByRole("link", { name })).toHaveAttribute(
			"href",
			href
		);
		expect(within(row).getByRole("link", { name })).toHaveAttribute(
			"href",
			href
		);
	}
});
