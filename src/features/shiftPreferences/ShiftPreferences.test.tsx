import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
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
	WEEKDAY_MORNINGS,
	weeklyAvailabilityFixture,
} from "@/features/availability/fixtures";
import {
	fixtureTeamPage,
	fixtureWeek,
} from "@/features/shiftPreferences/fixtures";
import { TEAM_PAGE_SIZE } from "@/features/shiftPreferences/api";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const MY_PROFILE = "GET /api/v1/companies/c-1/me/profile";
const MY_AVAILABILITY_PATH = "/api/v1/companies/c-1/me/availability";
const MY_PREFERENCES_PATH = "/api/v1/companies/c-1/me/shift-preferences";
const TEAM_PATH = "/api/v1/companies/c-1/shift-preferences";
const READ = "shift_preference:read";

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
	[`GET ${MY_AVAILABILITY_PATH}`]: {
		status: 200,
		body: envelope(weeklyAvailabilityFixture(WEEKDAY_MORNINGS)),
	},
	[`GET ${MY_PREFERENCES_PATH}`]: {
		status: 200,
		body: envelope(fixtureWeek()),
	},
	[`GET ${TEAM_PATH}`]: { status: 200, body: envelope(fixtureTeamPage()) },
});

/** The team list's query for this week and Branch b-1, with `department` when given. */
const teamSearch = (department?: string): string =>
	`weekStartMonday=${mondayOf(new Date())}&branchId=b-1${department ? `&departmentId=${department}` : ""}&page=0&size=${TEAM_PAGE_SIZE}`;

const navigation = (): HTMLElement => screen.getByRole("navigation");

const tabNames = (): Array<string | null> =>
	within(screen.getByRole("tablist"))
		.getAllByRole("tab")
		.map((tab) => tab.textContent?.trim() ?? null);

describe("ShiftPreferences", () => {
	it("gives everyone their own week from the menu, without asking for availability or a team", async () => {
		const calls = stubApi(routes("FULL_TIME", workspaceReply([])));
		await open("/shift-preferences");

		expect(
			await screen.findByRole("heading", {
				level: 1,
				name: "Shift preferences",
			})
		).toBeVisible();
		expect(
			await screen.findByRole("table", { name: "Shift preferences" })
		).toBeVisible();
		expect(tabNames()).toEqual(["My preferences"]);
		expect(
			within(navigation()).getByRole("link", { name: "Shift preferences" })
		).toBeVisible();
		// Availability is for part-timers and those who read theirs, so this person is not offered it.
		expect(
			within(navigation()).queryByRole("link", { name: "Availability" })
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(/You haven’t marked yourself available/)
		).not.toBeInTheDocument();
		expect(calls.some((call) => call.path === MY_AVAILABILITY_PATH)).toBe(
			false
		);
		expect(calls.some((call) => call.path === TEAM_PATH)).toBe(false);
	});

	it("warns a part-timer of the days they have no availability on, linking to their week", async () => {
		const calls = stubApi(routes("PART_TIME", workspaceReply([])));
		await open("/shift-preferences");

		// The availability pattern holds weekday mornings only, so the weekend is named.
		expect(
			await screen.findByText(
				/You haven’t marked yourself available on Sat.*Sun/
			)
		).toBeVisible();
		expect(
			screen.getByRole("link", { name: "Set your availability first" })
		).toHaveAttribute(
			"href",
			`/availability?view=mine&week=${mondayOf(new Date())}`
		);
		expect(calls.some((call) => call.path === MY_AVAILABILITY_PATH)).toBe(true);
	});

	it("offers the team to someone holding the read key, listing the header's Branch", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes("FULL_TIME", workspaceReply([READ])));
		const { router } = await open("/shift-preferences");
		await screen.findByRole("table", { name: "Shift preferences" });

		expect(tabNames()).toEqual(["My preferences", "Team"]);
		expect(calls.some((call) => call.path === TEAM_PATH)).toBe(false);
		await user.click(screen.getByRole("tab", { name: "Team" }));

		const table = await screen.findByRole("table", {
			name: "Team shift preferences",
		});
		expect(await within(table).findByText("Alex Example")).toBeVisible();
		expect(
			calls.filter((call) => call.path === TEAM_PATH).map((call) => call.search)
		).toEqual([teamSearch()]);
		await waitFor(() => {
			expect(router.state.location.search).toEqual({ view: "team" });
		});
	});

	it("narrows the team to the Department in the URL, as the Filters set it", async () => {
		const calls = stubApi(routes("FULL_TIME", workspaceReply([READ])));
		await open("/shift-preferences?view=team&department=d-1");

		await screen.findByRole("table", { name: "Team shift preferences" });
		expect(
			calls.filter((call) => call.path === TEAM_PATH).map((call) => call.search)
		).toEqual([teamSearch("d-1")]);
		expect(screen.getByRole("button", { name: /Filters/ })).toBeVisible();
	});
});
