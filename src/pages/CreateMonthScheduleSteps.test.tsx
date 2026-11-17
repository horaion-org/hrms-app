import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import {
	currentUserReply,
	openApp,
	settled,
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
	CONSTRAINT_FIXTURES,
	CONSTRAINT_OPTIONS_RESPONSE,
} from "@/features/scheduling/constraints/fixtures";
import {
	monthGenerationCheckFixture,
	ungeneratedMonthFixture,
} from "@/features/scheduling/months/fixtures";
import { readinessFixture } from "@/features/scheduling/readiness/fixtures";
import { schedulingWorkspace } from "@/features/scheduling/schedules/fixtures";
import {
	SHIFT_FIXTURES,
	departmentShiftFixture,
} from "@/features/scheduling/shifts/fixtures";

/*
 * The month wizard moving between its steps: what Setup holds must survive
 * going to Generate and back. The page's other behaviour is tested in
 * features/scheduling/CreateMonthSchedule.test.tsx.
 */

vi.setConfig({ testTimeout: 15_000 });

const COMPANY = "/api/v1/companies/c-1";
const DEPARTMENT = `${COMPANY}/branches/b-1/departments/d-1`;
const DECEMBER = `${COMPANY}/schedule-months/2026-12`;
const EVERY_KEY = [
	"schedule:read",
	"schedule:create",
	"schedule:update",
	"schedule:generate",
	"shift:read",
	"constraint:read",
];

const reply = (data: unknown): StubReply => ({
	status: 200,
	body: envelope(data),
});

let app: OpenedApp | undefined;
beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	// Thursday 12 Nov 2026: November has weeks to schedule, so the page suggests it.
	vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 10, 12) });
	stubApi({
		"POST /api/v1/public/sessions/refreshes": accessPassReply(),
		"GET /api/v1/me": currentUserReply(),
		"GET /api/v1/me/workspace": reply(schedulingWorkspace(EVERY_KEY)),
		[`GET ${COMPANY}/scheduling-readiness`]: reply([readinessFixture()]),
		[`GET ${COMPANY}/schedule-months`]: reply([]),
		[`GET ${DECEMBER}`]: reply(ungeneratedMonthFixture()),
		[`GET ${DECEMBER}/generation-check`]: reply(monthGenerationCheckFixture()),
		[`GET ${DEPARTMENT}/shifts`]: reply(
			SHIFT_FIXTURES.map((shift) => departmentShiftFixture(shift))
		),
		[`GET ${DEPARTMENT}/constraints`]: reply(CONSTRAINT_FIXTURES),
		[`GET ${DEPARTMENT}/constraint-options`]: reply(
			CONSTRAINT_OPTIONS_RESPONSE
		),
	});
});
afterEach(() => {
	app?.disconnect();
	app?.queryClient.clear();
	app = undefined;
	endSession("expired");
	resetApiClient();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	localStorage.clear();
});

const monthField = (): HTMLElement =>
	screen.getByRole("button", { name: /Month/ });

/** The names of the Weeks table's tick boxes, in order. */
const weekBoxNames = (): Array<string> =>
	within(screen.getByRole("table", { name: "Weeks" }))
		.getAllByRole("checkbox")
		.map((box) => box.getAttribute("aria-label") ?? "")
		.filter((name) => name.startsWith("Select Mon"));

describe("Schedule a month: going back from Generate", () => {
	it("given_aMonthChosenByHand_when_backFromGenerate_then_theSameMonthWeeksAndUrl", async () => {
		const user = userEvent.setup();
		app = await openApp("/scheduling/new?department=d-1");
		renderAuthApp(app);
		await vi.waitFor(() => {
			expect(monthField()).toHaveTextContent("November 2026");
		});

		await user.click(monthField());
		await user.click(
			await screen.findByRole("option", { name: "December 2026" })
		);
		await screen.findByRole("checkbox", {
			name: "Select Mon, Dec 7 to Sun, Dec 13",
		});
		const decemberWeeks = weekBoxNames();
		const next = screen.getByRole("button", { name: "Next" });
		await vi.waitFor(() => {
			expect(next).toBeEnabled();
		});
		await user.click(next);
		await screen.findByRole("button", { name: /^Generate December/ });
		await user.click(screen.getByRole("button", { name: "Back" }));

		await screen.findByRole("table", { name: "Weeks" });
		await settled(app.router);
		expect(monthField()).toHaveTextContent("December 2026");
		expect(weekBoxNames()).toEqual(decemberWeeks);
		expect(app.router.state.location.search).toEqual({
			step: "setup",
			department: "d-1",
			month: "2026-12",
		});
	});
});
