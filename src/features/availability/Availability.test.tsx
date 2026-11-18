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
	memberWeekFixture,
	WEEKDAY_MORNINGS,
	weeklyAvailabilityFixture,
} from "@/features/availability/fixtures";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const MY_PROFILE = "GET /api/v1/companies/c-1/me/profile";
const MINE_PATH = "/api/v1/companies/c-1/me/availability";
const TEAM_PATH = "/api/v1/companies/c-1/availability";
const MEMBERS_PATH = "/api/v1/companies/c-1/member-profiles";
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
	it("shows a part-timer their own week only, with nothing granted", async () => {
		const calls = stubApi(routes("PART_TIME", workspaceReply([])));
		await open("/availability");

		expect(
			await screen.findByRole("heading", { level: 1, name: "Availability" })
		).toBeVisible();
		expect(await screen.findAllByText("09:00–13:00")).toHaveLength(5);
		expect(tabNames()).toEqual(["My availability"]);
		expect(
			within(navigation()).getByRole("link", { name: "Availability" })
		).toBeVisible();
		expect(calls.some((call) => call.path === TEAM_PATH)).toBe(false);
	});

	it("shows someone holding the read key the team view only, for this week", async () => {
		const calls = stubApi(routes("FULL_TIME", workspaceReply([READ])));
		const { router } = await open("/availability");

		const table = await screen.findByRole("table", {
			name: "Team availability",
		});
		expect(await within(table).findByText("Aisha Rahman")).toBeVisible();
		expect(tabNames()).toEqual(["Team"]);
		expect(
			calls.filter((call) => call.path === TEAM_PATH).map((call) => call.search)
		).toEqual([`weekStartMonday=${mondayOf(new Date())}&branchId=b-1`]);
		expect(calls.some((call) => call.path === MINE_PATH)).toBe(false);
		await waitFor(() => {
			// The tab is written so the header knows it; the first Branch is shown, not written.
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
		const { router } = await open("/availability");
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

	it("starts the team on the person's home Branch and lists every Branch once All branches is chosen", async () => {
		const user = userEvent.setup();
		// Orchard (b-1, the person's home Branch) and Tampines (b-2).
		const calls = stubApi(
			routes("FULL_TIME", {
				status: 200,
				body: envelope(companyWideWorkspace([READ])),
			})
		);
		const { router } = await open("/availability");
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
		await open("/availability");

		const table = await screen.findByRole("table", {
			name: "Team availability",
		});
		expect(await within(table).findByText("Aisha Rahman")).toBeVisible();
		expect(
			calls.filter((call) => call.path === TEAM_PATH).map((call) => call.search)
		).toEqual([`weekStartMonday=${mondayOf(new Date())}&branchId=b-1`]);
	});

	it("gives a part-timer holding the read key both tabs, their own first", async () => {
		const user = userEvent.setup();
		stubApi(routes("PART_TIME", workspaceReply([READ])));
		const { router } = await open("/availability");

		await screen.findAllByText("09:00–13:00");
		expect(tabNames()).toEqual(["My availability", "Team"]);
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

	it("offers nothing to someone neither part-time nor holding the read key", async () => {
		stubApi(routes("FULL_TIME", workspaceReply([])));
		await open("/availability");

		expect(
			await screen.findByText(
				"Availability is for part-time members and the people who manage them, so there’s nothing here for you in this company."
			)
		).toBeVisible();
		expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
		expect(
			within(navigation()).queryByRole("link", { name: "Availability" })
		).not.toBeInTheDocument();
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
		const { router } = await open("/availability");
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
		await open("/availability");
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

	it.each([
		["All branches", "all", ""],
		["one Branch", "b-1", "&branchId=b-1"],
	])(
		"saves a row's week under %s, closing the editor, confirming it and showing the new hours",
		async (_scope, branch, branchSearch) => {
			const user = userEvent.setup();
			const thisWeek = mondayOf(new Date());
			const aishaWeek = `${MEMBERS_PATH}/m-aisha/availability/weeks/${thisWeek}`;
			const savedAisha = memberWeekFixture({
				membershipId: "m-aisha",
				source: "OVERRIDE",
				windows: [{ date: thisWeek, startTime: "10:00", endTime: "14:00" }],
			});
			const calls = stubApi({
				...routes("FULL_TIME", {
					status: 200,
					body: envelope(companyWideWorkspace([READ, UPDATE])),
				}),
				// The list as it was, then as the save left it.
				[`GET ${TEAM_PATH}`]: [
					{
						status: 200,
						body: envelope({
							weekStartMonday: thisWeek,
							members: MEMBER_WEEK_FIXTURES,
						}),
					},
					{
						status: 200,
						body: envelope({
							weekStartMonday: thisWeek,
							members: [savedAisha],
						}),
					},
				],
				[`PUT ${aishaWeek}`]: {
					status: 200,
					body: envelope({
						membershipId: "m-aisha",
						weekStartMonday: thisWeek,
						days: weeklyAvailabilityFixture(WEEKDAY_MORNINGS).days,
					}),
				},
			});
			const opened = await open(`/availability?view=team&branch=${branch}`);
			await user.click(
				await screen.findByRole("button", {
					name: "Edit Aisha Rahman’s availability",
				})
			);
			const dialog = await screen.findByRole("dialog", {
				name: "Edit availability",
			});

			await user.click(within(dialog).getByRole("button", { name: "Save" }));

			// The save settles with its confirmation, the one the app's toast shows ("Availability saved.").
			await waitFor(() => {
				expect(
					opened.queryClient
						.getMutationCache()
						.getAll()
						.map((save) => [save.state.status, save.meta?.successMessage])
				).toEqual([["success", "availability.saved"]]);
			});
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", { name: "Edit availability" })
				).not.toBeInTheDocument();
			});
			expect(
				await within(
					screen.getByRole("table", { name: "Team availability" })
				).findByText("10:00–14:00")
			).toBeVisible();
			// The header's scope is read before and after the save: no Branch under All branches.
			const listSearch = `weekStartMonday=${thisWeek}${branchSearch}`;
			expect(
				calls
					.filter((call) => call.path === TEAM_PATH)
					.map((call) => call.search)
			).toEqual([listSearch, listSearch]);
		}
	);

	it("moves a week on, and back to this week, through the URL", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes("FULL_TIME", workspaceReply([READ])));
		const { router } = await open("/availability");
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

/** Opens "Apply availability", chooses `name` and goes on to their week. */
const applyFor = async (
	user: ReturnType<typeof userEvent.setup>,
	name: string
): Promise<void> => {
	await user.click(
		await screen.findByRole("button", { name: "Apply availability" })
	);
	const step = await screen.findByRole("dialog", {
		name: "Apply availability",
	});
	await user.click(within(step).getByRole("button", { name: "Employee" }));
	// An option's name is the person's name, then the line that tells them apart.
	await user.click(
		await screen.findByRole("option", { name: new RegExp(`^${name}`) })
	);
	await user.click(within(step).getByRole("button", { name: "Continue" }));
};

describe("Availability: applying for someone", () => {
	it("offers Apply on the Team tab to someone holding the update key", async () => {
		stubApi(routes("FULL_TIME", workspaceReply([READ, UPDATE])));
		await open("/availability");

		expect(
			await screen.findByRole("button", { name: "Apply availability" })
		).toBeVisible();
	});

	it("does not offer Apply without the update key", async () => {
		stubApi(routes("FULL_TIME", workspaceReply([READ])));
		await open("/availability");

		await screen.findByText("Aisha Rahman");
		expect(
			screen.queryByRole("button", { name: "Apply availability" })
		).not.toBeInTheDocument();
	});

	it("does not offer Apply on a part-timer's own week", async () => {
		stubApi(routes("PART_TIME", workspaceReply([READ, UPDATE])));
		await open("/availability?view=mine");

		await screen.findByRole("tab", { name: "My availability", selected: true });
		expect(
			screen.queryByRole("button", { name: "Apply availability" })
		).not.toBeInTheDocument();
	});

	it("searches only the part-timers the person may set for", async () => {
		const user = userEvent.setup();
		stubApi(routes("FULL_TIME", workspaceReply([READ], [READ, UPDATE])));
		await open("/availability");

		await user.click(
			await screen.findByRole("button", { name: "Apply availability" })
		);
		const step = await screen.findByRole("dialog", {
			name: "Apply availability",
		});
		// Sales holds the update key; Faris is filed in Kitchen, which does not.
		await user.click(within(step).getByRole("button", { name: "Employee" }));
		expect(
			(await screen.findAllByRole("option")).map((option) => option.textContent)
		).toEqual(["Aisha Rahman Sales", "Cheryl Ng Sales"]);
		await user.keyboard("{Escape}");
		await user.type(
			within(step).getByRole("searchbox", { name: "Search employees" }),
			"Faris"
		);
		expect(
			within(step).getByText("No one you may apply for matches this search.")
		).toBeVisible();
	});

	it("opens the chosen part-timer's week and saves it as their row does", async () => {
		const user = userEvent.setup();
		const aishaWeek = `${MEMBERS_PATH}/m-aisha/availability/weeks/${mondayOf(new Date())}`;
		const calls = stubApi({
			...routes("FULL_TIME", workspaceReply([READ, UPDATE])),
			[`PUT ${aishaWeek}`]: { status: 204 },
		});
		await open("/availability");

		await applyFor(user, "Aisha Rahman");
		const dialog = await screen.findByRole("dialog", {
			name: "Edit availability",
		});
		expect(
			within(dialog).getByRole("radio", { name: "This week only" })
		).toBeChecked();
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(
				calls.filter((call) => call.method === "PUT").map((call) => call.path)
			).toEqual([aishaWeek]);
		});
	});

	it("applies for this week when the week shown has ended", async () => {
		const user = userEvent.setup();
		const calls = stubApi(routes("FULL_TIME", workspaceReply([READ, UPDATE])));
		await open(`/availability?week=${weekFromThis(-2)}`);

		await applyFor(user, "Aisha Rahman");

		expect(
			await screen.findByRole("dialog", { name: "Edit availability" })
		).toHaveTextContent(dayjs(mondayOf(new Date())).format("MMM D"));
		expect(
			calls.filter((call) => call.path === TEAM_PATH).map((call) => call.search)
		).toContain(`weekStartMonday=${mondayOf(new Date())}&branchId=b-1`);
	});
});
