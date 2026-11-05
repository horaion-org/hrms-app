import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
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
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import type { Schedule } from "@/features/scheduling/schedules/api";
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
		{ status: "GENERATED", label: "Generated", background: "bg-warning-100" },
		{
			status: "GENERATION_FAILED",
			label: "Generation failed",
			background: "bg-error-100",
		},
		{ status: "PUBLISHED", label: "Published", background: "bg-success-100" },
		{ status: "REJECTED", label: "Rejected", background: "bg-error-100" },
		// A status a newer API adds still lists, as a neutral "Unknown".
		{ status: "ARCHIVED", label: "Unknown", background: "bg-neutral-400" },
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
					if (status === "DRAFT") return scheduleFixture(overrides);
					if (status === "ARCHIVED")
						return { ...generatedScheduleFixture(overrides), status };
					return generatedScheduleFixture({ ...overrides, status });
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
			href: "/scheduling/GENERATION_REQUESTED",
		},
		{
			status: "GENERATED",
			href: "/scheduling/GENERATED",
		},
		{
			status: "GENERATION_FAILED",
			href: "/scheduling/GENERATION_FAILED",
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

const SCHEDULE_PATH =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";

const listOf = (schedules: Array<Schedule>): StubReply => ({
	status: 200,
	body: envelope({ content: schedules, page: { hasNext: false } }),
});

/** The history's "More actions" menu for schedule s-1, opened. */
const openRowMenu = async (): Promise<void> => {
	const history = await screen.findByRole("table", {
		name: "Schedule history",
	});
	await userEvent.click(
		within(history).getByRole("button", {
			name: "More actions for Front Office - Week 42",
		})
	);
};

const openHistory = async (
	permissions: Array<string>,
	routes: Parameters<typeof stubApi>[0]
): Promise<ReturnType<typeof stubApi>> => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const calls = stubApi({
		"POST /api/v1/public/sessions/refreshes": accessPassReply(),
		"GET /api/v1/me": currentUserReply(),
		"GET /api/v1/me/workspace": {
			status: 200,
			body: envelope(schedulingWorkspace(permissions)),
		},
		...routes,
	});
	app = await openApp("/scheduling");
	renderAuthApp(app);
	return calls;
};

it("offers no row menu without schedule:delete", async () => {
	await openHistory(["schedule:read"], {
		"GET /api/v1/companies/c-1/schedules": listOf([
			generatedScheduleFixture({ status: "GENERATED" }),
		]),
	});

	await screen.findByRole("table", { name: "Schedule history" });
	expect(
		screen.queryByRole("button", {
			name: "More actions for Front Office - Week 42",
		})
	).toBeNull();
});

it("deletes a schedule from its history row after a danger confirm naming its department and week", async () => {
	const calls = await openHistory(["schedule:read", "schedule:delete"], {
		"GET /api/v1/companies/c-1/schedules": [
			listOf([generatedScheduleFixture({ status: "GENERATED" })]),
			listOf([]),
		],
		[`DELETE ${SCHEDULE_PATH}`]: { status: 204 },
	});
	const user = userEvent.setup();

	await openRowMenu();
	await user.click(screen.getByRole("menuitem", { name: "Delete" }));
	const dialog = screen.getByRole("dialog", {
		name: "Delete Front Office - Week 42?",
	});
	expect(dialog).toHaveTextContent(
		/This removes the Front Office schedule for .+, with its roster\. This can’t be undone\./
	);
	const confirm = within(dialog).getByRole("button", {
		name: "Delete schedule",
	});
	expect(confirm).toHaveClass("bg-error-600");
	await user.click(confirm);

	expect(await screen.findByText("No schedules yet.")).toBeInTheDocument();
	expect(screen.queryByRole("dialog")).toBeNull();
	expect(
		calls.filter(
			(call) => call.method === "DELETE" && call.path === SCHEDULE_PATH
		)
	).toHaveLength(1);
});

it("explains why a schedule being generated can't be deleted yet", async () => {
	const calls = await openHistory(["schedule:read", "schedule:delete"], {
		"GET /api/v1/companies/c-1/schedules": listOf([
			generatedScheduleFixture({ status: "GENERATION_REQUESTED" }),
		]),
	});
	const user = userEvent.setup();

	await openRowMenu();
	await user.click(screen.getByRole("menuitem", { name: "Delete" }));
	const dialog = screen.getByRole("dialog", {
		name: "Delete Front Office - Week 42?",
	});
	expect(dialog).toHaveTextContent(
		"This schedule is being generated. You can delete it once the run finishes."
	);
	expect(
		within(dialog).getByRole("button", { name: "Delete schedule" })
	).toBeDisabled();
	const footerClose = within(dialog)
		.getAllByRole("button", { name: "Close" })
		.find((button) => button.textContent === "Close");
	await user.click(footerClose!);

	expect(screen.queryByRole("dialog")).toBeNull();
	expect(calls.some((call) => call.method === "DELETE")).toBe(false);
});

it("shows a refused delete inside the dialog and keeps it open", async () => {
	await openHistory(["schedule:read", "schedule:delete"], {
		"GET /api/v1/companies/c-1/schedules": listOf([
			generatedScheduleFixture({ status: "GENERATED" }),
		]),
		[`DELETE ${SCHEDULE_PATH}`]: problemReply(
			409,
			"SCHEDULE_GENERATION_IN_PROGRESS"
		),
	});
	const user = userEvent.setup();

	await openRowMenu();
	await user.click(screen.getByRole("menuitem", { name: "Delete" }));
	const dialog = screen.getByRole("dialog", {
		name: "Delete Front Office - Week 42?",
	});
	await user.click(
		within(dialog).getByRole("button", { name: "Delete schedule" })
	);

	expect(await within(dialog).findByRole("alert")).toHaveTextContent(
		"This schedule is being generated. Try again once the run finishes."
	);
	expect(screen.getByRole("dialog")).toBeInTheDocument();
});

const SCHEDULES_PATH = "/api/v1/companies/c-1/schedules";
const FIRST_PAGE = "page=0&size=100&sort=updatedAt%2Cdesc";

const listSearchesOf = (calls: ReturnType<typeof stubApi>): Array<string> =>
	calls
		.filter((call) => call.path === SCHEDULES_PATH)
		.map((call) => call.search);

it("lists the header's one Branch and narrows it to a Department through Filters", async () => {
	const calls = await openHistory(["schedule:read"], {
		[`GET ${SCHEDULES_PATH}`]: listOf([scheduleFixture()]),
	});
	const user = userEvent.setup();
	await screen.findByRole("table", { name: "Schedule history" });

	// One Branch in reach: the header names it as text.
	expect(
		within(screen.getByRole("banner")).getByText("Main branch")
	).toBeVisible();
	await user.click(screen.getByRole("button", { name: "Filters" }));
	await user.click(screen.getByRole("button", { name: "Department" }));
	await user.click(screen.getByRole("option", { name: "Kitchen" }));

	await waitFor(() => {
		expect(app?.router.state.location.search).toEqual({ department: "d-2" });
	});
	expect(
		screen.getByRole("list", { name: "Active filters" })
	).toHaveTextContent("Department: Main branch › Kitchen");
	expect(listSearchesOf(calls)).toEqual([
		`${FIRST_PAGE}&branchId=b-1`,
		`${FIRST_PAGE}&branchId=b-1&departmentId=d-2`,
	]);

	await user.click(screen.getByRole("button", { name: "Clear filters" }));
	await waitFor(() => {
		expect(app?.router.state.location.search).toEqual({});
	});
});

it("lists every Branch once All branches is chosen, with every Department under its Branch", async () => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	// Orchard (Kitchen d-1, Bar d-2) and Tampines (Front d-3).
	const calls = stubApi({
		"POST /api/v1/public/sessions/refreshes": accessPassReply(),
		"GET /api/v1/me": currentUserReply(),
		"GET /api/v1/me/workspace": {
			status: 200,
			body: envelope(companyWideWorkspace(["schedule:read"])),
		},
		[`GET ${SCHEDULES_PATH}`]: listOf([scheduleFixture()]),
	});
	app = await openApp("/scheduling");
	renderAuthApp(app);
	const user = userEvent.setup();
	await screen.findByRole("table", { name: "Schedule history" });

	expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
		"Orchard"
	);
	await user.click(screen.getByRole("button", { name: "Branch" }));
	await user.click(screen.getByRole("option", { name: "All branches" }));
	await user.click(screen.getByRole("button", { name: "Filters" }));
	await user.click(screen.getByRole("button", { name: "Department" }));
	await user.click(
		within(screen.getByRole("group", { name: "Tampines" })).getByRole(
			"option",
			{ name: "Front" }
		)
	);

	await waitFor(() => {
		expect(app?.router.state.location.search).toEqual({
			branch: "all",
			department: "d-3",
		});
	});
	expect(
		screen.getByRole("list", { name: "Active filters" })
	).toHaveTextContent("Department: Tampines › Front");
	// A Department alone is unambiguous: no Branch is sent with it.
	expect(listSearchesOf(calls)).toEqual([
		`${FIRST_PAGE}&branchId=b-1`,
		FIRST_PAGE,
		`${FIRST_PAGE}&departmentId=d-3`,
	]);
});

it("offers no Filters while the header Branch has only one Department to choose", async () => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	// Orchard (Kitchen d-1, Bar d-2) and Tampines (Front d-3 only).
	stubApi({
		"POST /api/v1/public/sessions/refreshes": accessPassReply(),
		"GET /api/v1/me": currentUserReply(),
		"GET /api/v1/me/workspace": {
			status: 200,
			body: envelope(companyWideWorkspace(["schedule:read"])),
		},
		[`GET ${SCHEDULES_PATH}`]: listOf([scheduleFixture()]),
	});
	app = await openApp("/scheduling?branch=b-1");
	renderAuthApp(app);
	const user = userEvent.setup();
	await screen.findByRole("table", { name: "Schedule history" });
	expect(screen.getByRole("button", { name: "Filters" })).toBeVisible();

	await user.click(screen.getByRole("button", { name: "Branch" }));
	await user.click(screen.getByRole("option", { name: "Tampines" }));

	// Scheduling has no status filter, so a lone Department would leave the panel empty.
	await waitFor(() => {
		expect(
			screen.queryByRole("button", { name: "Filters" })
		).not.toBeInTheDocument();
	});
});
