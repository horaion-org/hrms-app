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

type Routes = Parameters<typeof stubApi>[0];

/** Signed in to company c-1 as a member holding no scheduling permission. */
const signedInAsWorker = (): Routes => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope(schedulingWorkspace([])),
	},
});

/** Aisha's own week on s-1, Monday to Sunday: four shifts, leave on Friday, a day off and a rest day. */
const aishaWeekWithLeave = (): Array<{
	scheduleId: string;
	assignment: unknown;
}> =>
	scheduleAssignmentsFixture()
		.filter((row) => row.member?.membershipId === "m-1")
		.map((row) => ({
			scheduleId: "s-1",
			assignment:
				row.day === "2026-10-16"
					? {
							...row,
							off: true,
							offReason: "LEAVE",
							dayType: null,
							shift: null,
							jobTitle: null,
							leaveTypeName: "Annual leave",
						}
					: row,
		}));

/** Her days from 12 October; any other two weeks answer with nothing found. */
const myRosterDaysReply = ({ search }: { search: string }): StubReply => {
	const [from, to] = [...new URLSearchParams(search).values()];
	const found = from === "2026-10-12";
	return {
		status: 200,
		body: envelope({
			from,
			to,
			rosters: found
				? [
						{
							scheduleId: "s-1",
							name: "Front Office - Week 42",
							branchName: "North",
							departmentName: "Front Office",
							timeZone: "Asia/Singapore",
							coveredFrom: "2026-10-12",
							coveredTo: "2026-10-18",
						},
					]
				: [],
			days: found ? aishaWeekWithLeave() : [],
		}),
	};
};

const openMyRosterDays = async (
	routes: Routes,
	entry = "/me/schedules?from=2026-10-12"
): Promise<ReturnType<typeof stubApi>> => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const calls = stubApi(routes);
	app = await openApp(entry);
	renderAuthApp(app);
	return calls;
};

it("shows two weeks of the member's own days: shifts, leave, a day off and days with no published roster", async () => {
	await openMyRosterDays({
		...signedInAsWorker(),
		[`GET ${MY_ROSTER_DAYS}`]: myRosterDaysReply,
	});

	const list = await screen.findByRole("list", { name: "Your days" });
	const days = within(list).getAllByRole("listitem");
	expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
		"My roster"
	);
	expect(days).toHaveLength(14);
	expect(days[0]).toHaveTextContent("Mon, Oct 12");
	expect(days[0]).toHaveTextContent("Front Office");
	expect(days[0]).toHaveTextContent("Front Desk Lead");
	expect(days[4]).toHaveTextContent("Annual leave");
	expect(days[5]).toHaveTextContent("Day off");
	for (const day of days.slice(7))
		expect(day).toHaveTextContent("No published roster yet");
	expect(days[6]).not.toHaveTextContent("No published roster yet");
});

it("links each roster the days come from to its whole team's roster", async () => {
	await openMyRosterDays({
		...signedInAsWorker(),
		[`GET ${MY_ROSTER_DAYS}`]: myRosterDaysReply,
	});

	const link = await screen.findByRole("link", {
		// formatRange puts thin spaces around the dash.
		name: /^See the team’s roster: Front Office, Oct 12\s–\s18, 2026$/,
	});
	expect(link).toHaveTextContent("See the team’s roster");
	expect(link).toHaveAttribute("href", "/me/schedules/s-1");
});

it("moves two weeks forward and back, reading each two weeks shown", async () => {
	const user = userEvent.setup();
	const calls = await openMyRosterDays({
		...signedInAsWorker(),
		[`GET ${MY_ROSTER_DAYS}`]: myRosterDaysReply,
	});
	await screen.findByRole("list", { name: "Your days" });

	await user.click(screen.getByRole("button", { name: "Next two weeks" }));

	expect(app?.router.state.location.search).toEqual({ from: "2026-10-26" });
	const list = await screen.findByRole("list", { name: "Your days" });
	expect(await within(list).findByText("Mon, Oct 26")).toBeInTheDocument();
	expect(
		within(list).getAllByText("No published roster yet")
	).toHaveLength(14);
	expect(
		calls.filter((call) => call.path === MY_ROSTER_DAYS).map((call) => call.search)
	).toContain("from=2026-10-26&to=2026-11-08");

	await user.click(screen.getByRole("button", { name: "Previous two weeks" }));

	expect(app?.router.state.location.search).toEqual({ from: "2026-10-12" });
	const back = await screen.findByRole("list", { name: "Your days" });
	expect(await within(back).findByText("Mon, Oct 12")).toBeInTheDocument();
});

/** A refused read is not retried, so its failure line shows at once. */
it("says the days could not be loaded when the read is refused", async () => {
	await openMyRosterDays({
		...signedInAsWorker(),
		[`GET ${MY_ROSTER_DAYS}`]: problemReply(400, "VALIDATION_FAILED"),
	});

	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Your days could not be loaded. Please try again."
	);
	expect(screen.queryByRole("list", { name: "Your days" })).toBeNull();
});
