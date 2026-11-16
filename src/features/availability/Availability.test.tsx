import { screen, waitFor, within } from "@testing-library/react";
import dayjs from "dayjs";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import {
	companyWideWorkspace,
	effectiveWorkspace,
} from "@/common/testing/effectiveWorkspace";
import {
	currentUserReply,
	openApp,
	type OpenedApp,
} from "@/common/testing/openApp";
import {
	accessPassReply,
	envelope,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { mondayOf } from "@/common/weeks";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import {
	MEMBER_WEEK_FIXTURES,
	WEEKDAY_MORNINGS,
	weeklyAvailabilityFixture,
} from "@/features/availability/fixtures";
import { fixtureWeek } from "@/features/shiftPreferences/fixtures";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const MY_PROFILE = "GET /api/v1/companies/c-1/me/profile";
const MINE_PATH = "/api/v1/companies/c-1/me/availability";
const TEAM_PATH = "/api/v1/companies/c-1/availability";
const MY_PREFERENCES_PATH = "/api/v1/companies/c-1/me/shift-preferences";
const READ = "work_availability:read";
const UPDATE = "work_availability:update";

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

const profileReply = (employmentType: string): StubReply => ({
	status: 200,
	body: envelope({
		membershipId: "m-c-1",
		employeeCode: "EMP-00007",
		displayName: "Kent Chua",
		email: "kent@company.com",
		phone: "+6591234821",
		branchId: "b-1",
		branchName: "Main branch",
		departmentId: "d-1",
		departmentName: "Sales",
		jobTitleId: "j-1",
		jobTitleName: "Sales associate",
		status: "ACTIVE",
		dateOfBirth: "1990-05-01",
		employmentType,
		hireDate: "2026-01-05",
		probationEndDate: null,
		endDate: null,
		reportsTo: null,
		invitationPending: false,
	}),
});

/** A workspace holding `company` company-wide and `sales` at Main branch's Sales Department only. */
const workspaceReply = (
	company: Array<string>,
	sales: Array<string> = []
): StubReply => ({
	status: 200,
	body: envelope(
		effectiveWorkspace({
			companies: [
				{
					uuid: "c-1",
					name: "Company c-1",
					permissions: company,
					branches: [
						{
							uuid: "b-1",
							name: "Main branch",
							status: "ACTIVE",
							country: "SG",
							permissions: [],
							departments: [
								{
									uuid: "d-1",
									name: "Sales",
									status: "ACTIVE",
									permissions: sales,
								},
								{
									uuid: "d-2",
									name: "Kitchen",
									status: "ACTIVE",
									permissions: [],
								},
							],
						},
					],
				},
			],
		})
	),
});

const routes = (
	employmentType: string,
	workspace: StubReply
): Record<string, StubReply> => ({
	[REFRESH]: accessPassReply(),
	[ME]: currentUserReply(),
	[WORKSPACE]: workspace,
	[MY_PROFILE]: profileReply(employmentType),
	[`GET ${MINE_PATH}`]: {
		status: 200,
		body: envelope(weeklyAvailabilityFixture(WEEKDAY_MORNINGS)),
	},
	[`GET ${TEAM_PATH}`]: {
		status: 200,
		body: envelope({
			weekStartMonday: mondayOf(new Date()),
			members: MEMBER_WEEK_FIXTURES,
		}),
	},
	[`GET ${MY_PREFERENCES_PATH}`]: {
		status: 200,
		body: envelope(fixtureWeek()),
	},
});

/** The Monday `by` weeks from this one. */
const weekFromThis = (by: number): string =>
	dayjs(mondayOf(new Date())).add(by, "week").format("YYYY-MM-DD");

const navigation = (): HTMLElement => screen.getByRole("navigation");

const tabNames = (): Array<string | null> =>
	within(screen.getByRole("tablist"))
		.getAllByRole("tab")
		.map((tab) => tab.textContent?.trim() ?? null);

describe("Availability", () => {
	it("shows a part-timer their own week and their shift preferences, with nothing granted", async () => {
		const calls = stubApi(routes("PART_TIME", workspaceReply([])));
		await open("/availability");

		expect(
			await screen.findByRole("heading", { level: 1, name: "Availability" })
		).toBeVisible();
		expect(await screen.findAllByText("09:00–13:00")).toHaveLength(5);
		expect(tabNames()).toEqual(["My availability", "Shift preferences"]);
		expect(
			within(navigation()).getByRole("link", { name: "Availability" })
		).toBeVisible();
		expect(calls.some((call) => call.path === TEAM_PATH)).toBe(false);
	});

	it("opens someone holding the read key, and not part-time, on the team: their first tab", async () => {
		const calls = stubApi(routes("FULL_TIME", workspaceReply([READ])));
		const { router } = await open("/availability");

		expect(
			await screen.findByRole("table", { name: "Team availability" })
		).toBeVisible();
		expect(tabNames()).toEqual(["Team", "Shift preferences"]);
		await waitFor(() => {
			expect(router.state.location.search).toEqual({ view: "team" });
		});
		expect(calls.some((call) => call.path === MY_PREFERENCES_PATH)).toBe(false);
	});

	it("shows someone holding the read key the team's week, without reading a week of their own", async () => {
		const calls = stubApi(routes("FULL_TIME", workspaceReply([READ])));
		const { router } = await open("/availability?view=team");

		const table = await screen.findByRole("table", {
			name: "Team availability",
		});
		expect(await within(table).findByText("Aisha Rahman")).toBeVisible();
		expect(tabNames()).toEqual(["Team", "Shift preferences"]);
		expect(
			calls.filter((call) => call.path === TEAM_PATH).map((call) => call.search)
		).toEqual([`weekStartMonday=${mondayOf(new Date())}&branchId=b-1`]);
		expect(calls.some((call) => call.path === MINE_PATH)).toBe(false);
		await waitFor(() => {
			// The first Branch is shown, not written.
			expect(router.state.location.search).toEqual({ view: "team" });
		});
		// Reading without the update key offers no editing.
		expect(
			within(table).queryByRole("button", { name: /^Edit / })
		).not.toBeInTheDocument();
	});

	it("shows the team's one Branch in the header and narrows to a Department through Filters", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes("FULL_TIME", workspaceReply([READ])));
		const { router } = await open("/availability?view=team");
		await screen.findByRole("table", { name: "Team availability" });

		// One Branch the team must show: the header names it as text.
		expect(screen.getByText("Main branch")).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Filters" }));
		await user.click(screen.getByRole("button", { name: "Department" }));
		await user.click(screen.getByRole("option", { name: "Kitchen" }));

		await waitFor(() => {
			expect(router.state.location.search).toEqual({
				view: "team",
				department: "d-2",
			});
		});
		expect(
			calls.filter((call) => call.path === TEAM_PATH).map((call) => call.search)
		).toContain(
			`weekStartMonday=${mondayOf(new Date())}&branchId=b-1&departmentId=d-2`
		);
		expect(
			screen.getByRole("list", { name: "Active filters" })
		).toHaveTextContent("Department: Main branch › Kitchen");
		await user.click(screen.getByRole("button", { name: "Clear filters" }));
		await waitFor(() => {
			expect(router.state.location.search).toEqual({ view: "team" });
		});
	});

	it("heads a chosen Department's shift preferences and lets the list say there is no access to them", async () => {
		const calls = stubApi(routes("FULL_TIME", workspaceReply([READ])));
		await open("/availability?view=team&department=d-1");

		expect(
			await screen.findByRole("heading", {
				level: 2,
				name: "Team shift preferences",
			})
		).toBeVisible();
		expect(
			screen.getByText(
				"You don’t have access to anyone’s shift preferences in this company."
			)
		).toBeVisible();
		expect(
			calls.some(
				(call) => call.path === "/api/v1/companies/c-1/shift-preferences"
			)
		).toBe(false);
	});

	it("starts the team on the person's home Branch and lists every Branch once All branches is chosen", async () => {
		const user = userEvent.setup();
		// Orchard (b-1, the person's home Branch) and Tampines (b-2).
		const calls = stubApi(
			routes("FULL_TIME", {
				status: 200,
				body: envelope(companyWideWorkspace([READ])),
			})
		);
		const { router } = await open("/availability?view=team");
		await screen.findByRole("table", { name: "Team availability" });

		expect(screen.getByRole("button", { name: "Branch" })).toHaveTextContent(
			"Orchard"
		);
		await user.click(screen.getByRole("button", { name: "Branch" }));
		await user.click(screen.getByRole("option", { name: "All branches" }));
		await waitFor(() => {
			expect(router.state.location.search).toEqual({
				view: "team",
				branch: "all",
			});
		});
		// Every Branch in scope: no Branch is sent, and the API applies the scope.
		await waitFor(() => {
			expect(
				calls
					.filter((call) => call.path === TEAM_PATH)
					.map((call) => call.search)
			).toEqual([
				`weekStartMonday=${mondayOf(new Date())}&branchId=b-1`,
				`weekStartMonday=${mondayOf(new Date())}`,
			]);
		});
	});

	it("lists the Branch of a Department-only read grant from the company's list", async () => {
		const calls = stubApi(routes("FULL_TIME", workspaceReply([], [READ])));
		await open("/availability?view=team");

		const table = await screen.findByRole("table", {
			name: "Team availability",
		});
		expect(await within(table).findByText("Aisha Rahman")).toBeVisible();
		expect(
			calls.filter((call) => call.path === TEAM_PATH).map((call) => call.search)
		).toEqual([`weekStartMonday=${mondayOf(new Date())}&branchId=b-1`]);
	});

	it("gives a part-timer holding the read key all three tabs, their own week first", async () => {
		const user = userEvent.setup();
		stubApi(routes("PART_TIME", workspaceReply([READ])));
		const { router } = await open("/availability");

		await screen.findAllByText("09:00–13:00");
		expect(tabNames()).toEqual([
			"My availability",
			"Team",
			"Shift preferences",
		]);
		// Their own week lists nothing by Branch: the URL names the tab and the header shows no Branch.
		await waitFor(() => {
			expect(router.state.location.search).toMatchObject({ view: "mine" });
		});
		expect(
			within(screen.getByRole("banner")).queryByText("Branch")
		).not.toBeInTheDocument();

		await user.click(screen.getByRole("tab", { name: "Team" }));
		expect(
			await screen.findByRole("table", { name: "Team availability" })
		).toBeVisible();
		await waitFor(() => {
			expect(router.state.location.search).toMatchObject({ view: "team" });
		});
		expect(
			within(screen.getByRole("banner")).getByText("Branch")
		).toBeVisible();
	});

	it("shows someone neither part-time nor holding the read key their shift preferences only, headed as such", async () => {
		const calls = stubApi(routes("FULL_TIME", workspaceReply([])));
		await open("/availability");

		expect(
			await screen.findByRole("table", { name: "Shift preferences" })
		).toBeVisible();
		expect(tabNames()).toEqual(["Shift preferences"]);
		expect(
			screen.getByRole("heading", { level: 1, name: "Shift preferences" })
		).toBeVisible();
		expect(
			screen.getByText("Choose the shifts you’d like to work, week by week.")
		).toBeVisible();
		// The menu offers the page to everyone, so a full-timer reaches it too.
		expect(
			within(navigation()).getByRole("link", { name: "Availability" })
		).toBeVisible();
		expect(
			screen.getByRole("button", { name: /^Choose shifts for Mon/ })
		).toBeVisible();
		expect(calls.some((call) => call.path === MINE_PATH)).toBe(false);
		expect(calls.some((call) => call.path === TEAM_PATH)).toBe(false);
	});

	it("offers editing only on the rows of the Departments where the update key is held", async () => {
		stubApi(routes("FULL_TIME", workspaceReply([READ], [READ, UPDATE])));
		await open("/availability?view=team");

		const table = await screen.findByRole("table", {
			name: "Team availability",
		});
		await within(table).findByText("Aisha Rahman");
		expect(
			within(table).getByRole("button", {
				name: "Edit Aisha Rahman’s availability",
			})
		).toBeVisible();
		expect(
			within(table).queryByRole("button", {
				name: "Edit Faris Ahmad’s availability",
			})
		).not.toBeInTheDocument();
	});

	it("shows a week that has ended without offering to change it", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes("FULL_TIME", workspaceReply([READ, UPDATE])));
		const { router } = await open("/availability?view=team");
		const table = await screen.findByRole("table", {
			name: "Team availability",
		});
		await within(table).findByText("Aisha Rahman");
		const lastWeek = weekFromThis(-1);

		await user.click(screen.getByRole("button", { name: "Previous week" }));

		await waitFor(() => {
			expect(router.state.location.search).toMatchObject({ week: lastWeek });
		});
		await waitFor(() => {
			expect(
				calls
					.filter((call) => call.path === TEAM_PATH)
					.map((call) => call.search)
			).toContain(`weekStartMonday=${lastWeek}&branchId=b-1`);
		});
		expect(
			await screen.findByText(
				"This week has ended, so its availability can’t be changed."
			)
		).toBeVisible();
		expect(
			within(
				screen.getByRole("table", { name: "Team availability" })
			).queryByRole("button", { name: /^Edit / })
		).not.toBeInTheDocument();
	});

	it("opens one editor for a row, on this week, without reading a pattern it already shows", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes("FULL_TIME", workspaceReply([READ, UPDATE])));
		await open("/availability?view=team");
		await screen.findByText("Aisha Rahman");

		await user.click(
			screen.getByRole("button", { name: "Edit Aisha Rahman’s availability" })
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Edit availability",
		});
		expect(
			within(dialog).getByRole("radio", { name: "This week only" })
		).toBeChecked();
		expect(within(dialog).getAllByRole("group")).toHaveLength(2);
		expect(
			calls.filter((call) => call.path.includes("/member-profiles/"))
		).toEqual([]);
	});

	it("moves a week on, and back to this week, through the URL", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes("FULL_TIME", workspaceReply([READ])));
		const { router } = await open("/availability?view=team");
		await screen.findByRole("table", { name: "Team availability" });
		const next = weekFromThis(1);

		await user.click(screen.getByRole("button", { name: "Next week" }));

		await waitFor(() => {
			expect(router.state.location.search).toMatchObject({ week: next });
		});
		await waitFor(() => {
			expect(
				calls
					.filter((call) => call.path === TEAM_PATH)
					.map((call) => call.search)
			).toContain(`weekStartMonday=${next}&branchId=b-1`);
		});

		await user.click(screen.getByRole("button", { name: "This week" }));

		await waitFor(() => {
			expect(router.state.location.search).not.toHaveProperty("week");
		});
	});
});
