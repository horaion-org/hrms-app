import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
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
import {
	scheduleAssignmentsFixture,
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

const MY_ROSTER_DAYS = "/api/v1/companies/c-1/me/roster-days";
const MY_ROSTER = "/api/v1/companies/c-1/me/schedules/s-1";

type Routes = Parameters<typeof stubApi>[0];

const FRONT_OFFICE = {
	scheduleId: "s-1",
	name: "Front Office - Week 42",
	branchName: "North",
	departmentName: "Front Office",
	timeZone: "Asia/Singapore",
};

/** Signed in to company c-1 as a member holding no scheduling permission. */
const signedInAsWorker = (): Routes => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope(schedulingWorkspace([])),
	},
});

/** The rosters Aisha is on from 12 October, with her own rows; any other two weeks answer with nothing found. */
const myRosterDaysReply = ({ search }: { search: string }): StubReply => {
	const [from, to] = [...new URLSearchParams(search).values()];
	const found = from === "2026-10-12";
	return {
		status: 200,
		body: envelope({
			from,
			to,
			rosters: found
				? [{ ...FRONT_OFFICE, coveredFrom: "2026-10-12", coveredTo: "2026-10-18" }]
				: [],
			days: found
				? scheduleAssignmentsFixture()
						.filter((row) => row.member?.membershipId === "m-1")
						.map((assignment) => ({ scheduleId: "s-1", assignment }))
				: [],
		}),
	};
};

/** The whole published roster s-1, every member's row, as the member's own read gives it. */
const myRosterReply = (): StubReply => ({
	status: 200,
	body: envelope({
		...FRONT_OFFICE,
		periodStart: "2026-10-12",
		periodEnd: "2026-10-18",
		assignments: scheduleAssignmentsFixture(),
	}),
});

/** Aisha's two weeks: the roster-days read and the whole roster both answer. */
const aishasRoutes = (): Routes => ({
	...signedInAsWorker(),
	[`GET ${MY_ROSTER_DAYS}`]: myRosterDaysReply,
	[`GET ${MY_ROSTER}`]: myRosterReply(),
});

const openMyRosterDays = async (
	routes: Routes
): Promise<ReturnType<typeof stubApi>> => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const calls = stubApi(routes);
	app = await openApp("/me/schedules?from=2026-10-12");
	renderAuthApp(app);
	return calls;
};

/** The grid's row of the person named, once the whole roster is read. */
const rowOf = (name: string): Promise<HTMLElement> =>
	screen.findByRole("row", { name: new RegExp(name) });

it("shows every member of the published roster, the member's own row first", async () => {
	await openMyRosterDays(aishasRoutes());

	await rowOf("Ben Ong");
	const grid = screen.getByRole("table", { name: "Staff by day" });
	const names = within(grid)
		.getAllByRole("rowheader")
		.map((header) => header.textContent);
	expect(names).toEqual([
		expect.stringContaining("Aisha Rahman"),
		expect.stringContaining("Ben Ong"),
		expect.stringContaining("Chen Wei"),
	]);
	expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
		"My roster"
	);
	expect(
		screen.getByText(
			"Your department’s published roster. Days not yet published stay empty."
		)
	).toBeInTheDocument();
});

it("shows another member's leave as the roster gives it, and a day with no published roster as empty", async () => {
	await openMyRosterDays(aishasRoutes());

	const ben = await rowOf("Ben Ong");
	expect(
		within(ben).getByTitle("Ben Ong, Wed, Oct 14: On leave, Published")
	).toBeInTheDocument();
	const aisha = await rowOf("Aisha Rahman");
	expect(
		within(aisha).getByTitle("Aisha Rahman, Mon, Oct 19: No roster")
	).toBeInTheDocument();
});

it("links the roster to its own page", async () => {
	await openMyRosterDays(aishasRoutes());

	const link = await screen.findByRole("link", {
		// formatRange puts thin spaces around the dash.
		name: /^Open this roster: Front Office, Oct 12\s–\s18, 2026$/,
	});
	expect(link).toHaveTextContent("Open this roster");
	expect(link).toHaveAttribute("href", "/me/schedules/s-1");
});

/** A staff member has no scheduling key: every company read must be one of their own `/me` routes. */
it("reads only the member's own routes, never a manager's schedule route", async () => {
	const calls = await openMyRosterDays(aishasRoutes());

	await rowOf("Ben Ong");
	const companyPaths = calls
		.map((call) => call.path)
		.filter((path) => path.startsWith("/api/v1/companies/"));
	expect(companyPaths).toContain(MY_ROSTER_DAYS);
	expect(companyPaths).toContain(MY_ROSTER);
	for (const path of companyPaths)
		expect(path).toMatch(/^\/api\/v1\/companies\/c-1\/me\//);
});

it("moves two weeks forward and back, reading each two weeks shown", async () => {
	const user = userEvent.setup();
	const calls = await openMyRosterDays(aishasRoutes());
	await rowOf("Ben Ong");

	await user.click(screen.getByRole("button", { name: "Next two weeks" }));

	expect(app?.router.state.location.search).toEqual({ from: "2026-10-26" });
	expect(
		await screen.findByText("No one is rostered in these days yet.")
	).toBeInTheDocument();
	expect(
		calls
			.filter((call) => call.path === MY_ROSTER_DAYS)
			.map((call) => call.search)
	).toContain("from=2026-10-26&to=2026-11-08");

	await user.click(screen.getByRole("button", { name: "Previous two weeks" }));

	expect(app?.router.state.location.search).toEqual({ from: "2026-10-12" });
	expect(await rowOf("Chen Wei")).toBeInTheDocument();
});

it("says the rosters are loading while the whole roster is read", async () => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	stubApi(aishasRoutes());
	// The whole roster's read never answers.
	const answered = globalThis.fetch;
	vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
		url.includes("/me/schedules/") ? new Promise(() => {}) : answered(url, init)
	);
	app = await openApp("/me/schedules?from=2026-10-12");
	renderAuthApp(app);

	expect(await screen.findByText("Loading the rosters…")).toBeInTheDocument();
	expect(screen.queryByRole("row", { name: /Ben Ong/ })).toBeNull();
});

/** A refused read is not retried, so its failure line shows at once. */
it("says the roster could not be loaded when the read is refused", async () => {
	await openMyRosterDays({
		...signedInAsWorker(),
		[`GET ${MY_ROSTER_DAYS}`]: problemReply(400, "VALIDATION_FAILED"),
	});

	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Your roster could not be loaded. Please try again."
	);
	expect(screen.queryByRole("table", { name: "Staff by day" })).toBeNull();
});

it("says the rosters could not be loaded when a whole roster is refused", async () => {
	await openMyRosterDays({
		...signedInAsWorker(),
		[`GET ${MY_ROSTER_DAYS}`]: myRosterDaysReply,
		[`GET ${MY_ROSTER}`]: problemReply(404, "SCHEDULE_NOT_FOUND"),
	});

	expect(await screen.findByRole("alert")).toHaveTextContent(
		"The rosters couldn't be loaded. Reload the page to try again."
	);
});
