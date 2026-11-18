import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import { ISO_DATE_FORMAT } from "@/common/isoDate";
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
	FIXTURE_WEEK,
	fixtureTeamPage,
	fixtureWeek,
	MONDAY_WITH_MORNING,
} from "@/features/shiftPreferences/fixtures";
import {
	TEAM_PAGE_SIZE,
	type TeamMemberWeek,
} from "@/features/shiftPreferences/api";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const MY_PROFILE = "GET /api/v1/companies/c-1/me/profile";
const MY_AVAILABILITY_PATH = "/api/v1/companies/c-1/me/availability";
const MY_PREFERENCES_PATH = "/api/v1/companies/c-1/me/shift-preferences";
const TEAM_PATH = "/api/v1/companies/c-1/shift-preferences";
const READ = "shift_preference:read";
const UPDATE = "shift_preference:update";
const MEMBERS_PATH = "/api/v1/companies/c-1/member-profiles";

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

	it("offers a member's edit control to someone holding the update key, opening their week", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...routes("FULL_TIME", workspaceReply([READ, UPDATE])),
			[`GET ${MEMBERS_PATH}/m-1/shift-preferences/weeks/${mondayOf(new Date())}`]:
				{ status: 200, body: envelope(fixtureWeek()) },
		});
		await open("/shift-preferences?view=team");

		await user.click(
			await screen.findByRole("button", {
				name: "Edit Alex Example’s shift preferences",
			})
		);

		expect(
			await screen.findByRole("dialog", { name: "Edit shift preferences" })
		).toBeVisible();
		await waitFor(() => {
			expect(
				calls.some((call) =>
					call.path.startsWith(`${MEMBERS_PATH}/m-1/shift-preferences/weeks/`)
				)
			).toBe(true);
		});
	});

	it("offers no edit control without the update key", async () => {
		stubApi(routes("FULL_TIME", workspaceReply([READ])));
		await open("/shift-preferences?view=team");

		const table = await screen.findByRole("table", {
			name: "Team shift preferences",
		});
		await within(table).findByText("Alex Example");
		expect(within(table).queryByRole("button")).not.toBeInTheDocument();
	});

	it("offers the edit control only on members filed where the update key is held", async () => {
		const memberOf = (
			membershipId: string,
			displayName: string,
			departmentId: string | null
		): TeamMemberWeek => ({
			...fixtureTeamPage().content[0]!,
			membershipId,
			displayName,
			departmentId,
		});
		stubApi({
			...routes("FULL_TIME", workspaceReply([READ], [UPDATE])),
			[`GET ${TEAM_PATH}`]: {
				status: 200,
				body: envelope({
					content: [
						memberOf("m-1", "Alex Example", "d-1"),
						memberOf("m-2", "Bea Kitchen", "d-2"),
						memberOf("m-3", "Cy Unassigned", null),
					],
					page: { totalElements: 3 },
				}),
			},
		});
		await open("/shift-preferences?view=team");

		const table = await screen.findByRole("table", {
			name: "Team shift preferences",
		});
		await within(table).findByText("Cy Unassigned");
		// Sales holds the key; Kitchen does not, and a member filed nowhere is decided company-wide.
		expect(
			within(table)
				.getAllByRole("button")
				.map((button) => button.getAttribute("aria-label"))
		).toEqual(["Edit Alex Example’s shift preferences"]);
	});
});

/** A team row of `fixtureTeamPage`'s week for another member. */
const teamMemberOf = (
	membershipId: string,
	displayName: string | null,
	departmentId: string | null
): TeamMemberWeek => ({
	...fixtureTeamPage().content[0]!,
	membershipId,
	displayName,
	departmentId,
});

/** A team list reply of `members`, all on one page. */
const teamReply = (members: Array<TeamMemberWeek>): StubReply => ({
	status: 200,
	body: envelope({ content: members, page: { totalElements: members.length } }),
});

/** Alex's week as a member, read for this week. */
const ALEX_WEEK = `GET ${MEMBERS_PATH}/m-1/shift-preferences/weeks/${mondayOf(new Date())}`;

/** Opens "Apply shift preferences", chooses `name` and goes on to their week. */
const applyFor = async (
	user: ReturnType<typeof userEvent.setup>,
	name: string
): Promise<void> => {
	await user.click(
		await screen.findByRole("button", { name: "Apply shift preferences" })
	);
	const step = await screen.findByRole("dialog", {
		name: "Apply shift preferences",
	});
	await user.click(within(step).getByRole("button", { name: "Employee" }));
	await user.click(await screen.findByRole("option", { name }));
	await user.click(within(step).getByRole("button", { name: "Continue" }));
};

describe("ShiftPreferences: applying for someone", () => {
	it("offers Apply on the Team tab to someone holding the update key", async () => {
		const user = userEvent.setup();
		stubApi(routes("FULL_TIME", workspaceReply([READ, UPDATE])));
		await open("/shift-preferences");
		await screen.findByRole("table", { name: "Shift preferences" });

		// As Leave places "Apply leave": with the team, not on the person's own week.
		expect(
			screen.queryByRole("button", { name: "Apply shift preferences" })
		).not.toBeInTheDocument();
		await user.click(screen.getByRole("tab", { name: "Team" }));

		expect(
			await screen.findByRole("button", { name: "Apply shift preferences" })
		).toBeVisible();
	});

	it("does not offer Apply without the update key", async () => {
		stubApi(routes("FULL_TIME", workspaceReply([READ])));
		await open("/shift-preferences?view=team");

		const table = await screen.findByRole("table", {
			name: "Team shift preferences",
		});
		await within(table).findByText("Alex Example");
		expect(
			screen.queryByRole("button", { name: "Apply shift preferences" })
		).not.toBeInTheDocument();
	});

	it("searches only the members the person may set for", async () => {
		const user = userEvent.setup();
		stubApi({
			...routes("FULL_TIME", workspaceReply([READ], [UPDATE])),
			[`GET ${TEAM_PATH}`]: teamReply([
				teamMemberOf("m-1", "Alex Example", "d-1"),
				teamMemberOf("m-2", "Bea Kitchen", "d-2"),
				teamMemberOf("m-3", null, "d-1"),
			]),
		});
		await open("/shift-preferences?view=team");

		await user.click(
			await screen.findByRole("button", { name: "Apply shift preferences" })
		);
		const step = await screen.findByRole("dialog", {
			name: "Apply shift preferences",
		});
		// Sales holds the update key; Kitchen does not, and a removed member is never offered.
		await user.click(within(step).getByRole("button", { name: "Employee" }));
		expect(
			(await screen.findAllByRole("option")).map((option) => option.textContent)
		).toEqual(["Alex Example"]);
		await user.keyboard("{Escape}");
		await user.type(
			within(step).getByRole("searchbox", { name: "Search employees" }),
			"Bea"
		);
		expect(
			within(step).getByText("No one you may apply for matches this search.")
		).toBeVisible();
	});

	it("finds a member on a later page of the team list", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...routes("FULL_TIME", workspaceReply([READ, UPDATE])),
			[`GET ${TEAM_PATH}`]: (call) => ({
				status: 200,
				body: envelope({
					content: [
						call.search.includes("page=1")
							? teamMemberOf("m-2", "Bea Kitchen", "d-2")
							: teamMemberOf("m-1", "Alex Example", "d-1"),
					],
					page: { totalElements: TEAM_PAGE_SIZE + 1 },
				}),
			}),
		});
		await open("/shift-preferences?view=team");

		await user.click(
			await screen.findByRole("button", { name: "Apply shift preferences" })
		);
		const step = await screen.findByRole("dialog", {
			name: "Apply shift preferences",
		});
		await user.click(within(step).getByRole("button", { name: "Employee" }));

		expect(
			await screen.findByRole("option", { name: "Bea Kitchen" })
		).toBeVisible();
		expect(
			calls.filter((call) => call.path === TEAM_PATH).map((call) => call.search)
		).toContain(teamSearch().replace("page=0", "page=1"));
	});

	it("opens the chosen member's week and saves it as their row does", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			...routes("FULL_TIME", workspaceReply([READ, UPDATE])),
			[ALEX_WEEK]: { status: 200, body: envelope(fixtureWeek()) },
			[`PUT ${MEMBERS_PATH}/m-1/shift-preferences/days/${FIXTURE_WEEK}`]: {
				status: 200,
				body: envelope(MONDAY_WITH_MORNING),
			},
		});
		await open("/shift-preferences?view=team");

		await applyFor(user, "Alex Example");
		const week = await screen.findByRole("dialog", {
			name: "Edit shift preferences",
		});
		expect(week).toHaveTextContent("Alex Example");
		await user.click(
			await within(week).findByRole("button", {
				name: /^Choose shifts for Mon/,
			})
		);
		const day = screen.getByRole("dialog", { name: /^Choose shifts for Mon/ });
		await user.click(within(day).getByRole("checkbox", { name: /^Late/ }));
		await user.click(within(day).getByRole("button", { name: "Save" }));

		// The same request as the row's, so the same confirmation ("Shift preferences saved.", shiftPreferenceConfirmations.test.tsx).
		await waitFor(() => {
			expect(calls.some((call) => call.method === "PUT")).toBe(true);
		});
		expect(
			calls
				.filter((call) => call.method === "PUT")
				.map((call) => ({ path: call.path, body: call.body }))
		).toEqual([
			{
				path: `${MEMBERS_PATH}/m-1/shift-preferences/days/${FIXTURE_WEEK}`,
				body: { shiftIds: ["s-morning", "s-late"] },
			},
		]);
	});

	it("applies for this week when the week shown has ended", async () => {
		const user = userEvent.setup();
		const thisWeek = mondayOf(new Date());
		const weekEnded = dayjs(thisWeek)
			.subtract(2, "week")
			.format(ISO_DATE_FORMAT);
		const calls = stubApi({
			...routes("FULL_TIME", workspaceReply([READ, UPDATE])),
			[ALEX_WEEK]: { status: 200, body: envelope(fixtureWeek()) },
		});
		await open(`/shift-preferences?view=team&week=${weekEnded}`);

		await applyFor(user, "Alex Example");

		expect(
			await screen.findByRole("dialog", { name: "Edit shift preferences" })
		).toBeVisible();
		await waitFor(() => {
			expect(calls.some((call) => `GET ${call.path}` === ALEX_WEEK)).toBe(true);
		});
		expect(
			calls.filter((call) => call.path === TEAM_PATH).map((call) => call.search)
		).toContain(teamSearch());
	});
});
