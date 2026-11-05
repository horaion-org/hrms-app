import { screen, within } from "@testing-library/react";
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
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import {
	scheduleAssignmentsFixture,
	schedulingWorkspace,
	twoBranchSchedulingWorkspace,
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

const MY_ROSTER = "/api/v1/companies/c-1/me/schedules/s-1";

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

const openMyRoster = async (routes: Routes): Promise<void> => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	stubApi(routes);
	app = await openApp("/me/schedules/s-1");
	renderAuthApp(app);
};

it("shows a published roster the member is on, read-only and without the figures", async () => {
	await openMyRoster({
		...signedInAsWorker(),
		[`GET ${MY_ROSTER}`]: {
			status: 200,
			body: envelope({
				scheduleId: "s-1",
				name: "Front Office - Week 42",
				branchName: "North",
				departmentName: "Front Office",
				timeZone: "Asia/Singapore",
				periodStart: "2026-10-12",
				periodEnd: "2026-10-18",
				assignments: scheduleAssignmentsFixture(),
			}),
		},
	});

	expect(
		await screen.findByRole("row", { name: /Aisha Rahman/ })
	).toBeInTheDocument();
	expect(
		screen.getByRole("heading", {
			level: 1,
			// formatRange puts thin spaces around the dash.
			name: /^My roster · Front Office · Oct 12\s–\s18, 2026$/,
		})
	).toBeInTheDocument();
	expect(screen.getByText("Times in Asia/Singapore")).toBeInTheDocument();
	expect(screen.queryByText("Staff Rostered")).toBeNull();
	expect(screen.queryByRole("button", { name: /Publish/ })).toBeNull();
});

it("says the roster isn't available when the API refuses it with a 404", async () => {
	await openMyRoster({
		...signedInAsWorker(),
		[`GET ${MY_ROSTER}`]: problemReply(404, "SCHEDULE_NOT_FOUND"),
	});

	expect(await screen.findByRole("alert")).toHaveTextContent(
		"This roster isn’t available. It may not be published yet, or you aren’t on it."
	);
	expect(screen.queryByRole("table")).toBeNull();
});

it("shows no Branch in the header: it is the member's own roster, like their leave", async () => {
	await openMyRoster({
		...signedInAsWorker(),
		// Even someone who reads schedules across two Branches.
		"GET /api/v1/me/workspace": {
			status: 200,
			body: envelope(twoBranchSchedulingWorkspace(["schedule:read"])),
		},
		[`GET ${MY_ROSTER}`]: {
			status: 200,
			body: envelope({
				scheduleId: "s-1",
				name: "Front Office - Week 42",
				branchName: "North",
				departmentName: "Front Office",
				timeZone: "Asia/Singapore",
				periodStart: "2026-10-12",
				periodEnd: "2026-10-18",
				assignments: scheduleAssignmentsFixture(),
			}),
		},
	});
	await screen.findByRole("row", { name: /Aisha Rahman/ });

	expect(
		within(screen.getByRole("banner")).queryByText("Branch")
	).not.toBeInTheDocument();
});
