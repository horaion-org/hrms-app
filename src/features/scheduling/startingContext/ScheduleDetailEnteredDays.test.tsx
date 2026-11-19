import { screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
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
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import {
	generatedScheduleFixture,
	scheduleAssignmentsFixture,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";
import type { StartingDays } from "@/features/scheduling/startingContext/api";
import type { Workspace } from "@/features/workspace/api";
import {
	carriedWeek,
	firstWeek,
} from "@/features/scheduling/startingContext/fixtures";

/*
 * A schedule's own page when days were entered by hand before its run: one
 * line above the grid saying so, with the link to the set-up where they show.
 */

beforeAll(async () => {
	await import("@/pages/ScheduleDetail");
});
let app: OpenedApp | undefined;
afterEach(() => {
	app?.disconnect();
	app?.queryClient.clear();
	app = undefined;
	endSession("expired");
	resetApiClient();
	vi.restoreAllMocks();
	localStorage.clear();
});

const SCHEDULE =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";
const STARTING_DAYS = `${SCHEDULE}/starting-days`;
const NOTE = /shifts entered for the days before these days/;

const ok = (data: unknown): StubReply => ({
	status: 200,
	body: envelope(data),
});

/** Company c-1 for someone who reads schedules at Kitchen (d-2) only, not at Front Office (d-1), schedule s-1's own. */
const kitchenReaderWorkspace = (): Workspace => {
	const workspace = structuredClone(schedulingWorkspace([]));
	const kitchen = workspace.companies[0]!.branches[0]!.departments[1]!;
	kitchen.permissions = ["schedule:read"];
	return workspace;
};

/** Opens published schedule s-1 in `workspace` (a reader company-wide unless given), its starting days answering `startingDays`. */
const openSchedule = async (
	startingDays: StartingDays,
	workspace = schedulingWorkspace(["schedule:read"])
): Promise<ReturnType<typeof stubApi>> => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const calls = stubApi({
		"POST /api/v1/public/sessions/refreshes": accessPassReply(),
		"GET /api/v1/me": currentUserReply(),
		"GET /api/v1/me/workspace": {
			status: 200,
			body: envelope(workspace),
		},
		"GET /api/v1/companies/c-1/schedules/s-1": ok(
			generatedScheduleFixture({ status: "PUBLISHED" })
		),
		[`GET ${SCHEDULE}/assignments`]: ok(scheduleAssignmentsFixture()),
		[`GET ${STARTING_DAYS}`]: ok(startingDays),
	});
	app = await openApp("/scheduling/s-1");
	renderAuthApp(app);
	await screen.findByRole("heading", {
		level: 1,
		name: "Front Office Schedule",
	});
	return calls;
};

describe("a schedule's page, of the days entered by hand before its run", () => {
	/** Tan's Sunday night was entered before the run: the note counts him and links to the set-up. */
	it("says how many people have them, with the link to the set-up", async () => {
		await openSchedule(firstWeek());

		expect(
			await screen.findByText(
				"1 person has shifts entered for the days before these days. View them in the setup."
			)
		).toBeVisible();
		const link = screen.getByRole("link", { name: "View setup" });
		expect(link).toHaveAttribute(
			"href",
			"/scheduling/new?step=setup&scheduleId=s-1&departmentId=d-1"
		);
	});

	it("says nothing when rosters cover the days before and nobody was entered", async () => {
		const calls = await openSchedule(carriedWeek());

		await vi.waitFor(() => {
			expect(calls.some((call) => call.path === STARTING_DAYS)).toBe(true);
		});
		expect(screen.queryByText(NOTE)).toBeNull();
	});

	/** Without `schedule:read` at the schedule's Department, the entered days are never asked for or shown. */
	it("never asks for them for someone who may not read the Department's schedules", async () => {
		const calls = await openSchedule(firstWeek(), kitchenReaderWorkspace());

		// The page is up with its schedule read, so the note is mounted and had its chance to ask.
		expect(calls.some((call) => call.path === STARTING_DAYS)).toBe(false);
		expect(screen.queryByText(NOTE)).toBeNull();
	});
});
