import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
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
import { coverOfferFixture } from "@/features/scheduling/coverOffers/fixtures";
import type { DeletedScheduleRecord } from "@/features/scheduling/history/deletedSchedule";
import { editedAssignmentFixture } from "@/features/scheduling/rosterChanges/fixtures";
import {
	deletedScheduleFixture,
	scheduleAssignmentsFixture,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";

/** Wednesday of the fixtures' week in their Singapore branch. */
const IN_THE_FIXTURE_WEEK = new Date("2026-10-14T09:00:00+08:00");

// The router splits each page's code out; loading it once here keeps that
// first load out of the first test's time.
beforeAll(async () => {
	await import("@/pages/DeletedSchedule");
});
let app: OpenedApp | undefined;
beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"], now: IN_THE_FIXTURE_WEEK });
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

/** The deleted schedule's one read. */
const RECORD = "/api/v1/companies/c-1/deleted-schedules/s-1";
/** Every route of a live schedule s-1, by its id alone or at its department: none knows a deleted one. */
const LIVE_ROUTES = /\/schedules\/s-1(\/|$)/;
const RECORD_URL = "/scheduling/history/s-1";

/** Every action a live roster's page can offer; none belongs on a record. */
const ACTIONS =
	/^(Publish|Submit for approval|Approve|Reject|Regenerate|Generate|Delete|Withdraw|Undo|Validate schedule|Find cover|View setup|More actions|Accept|Decline|Export)/;

type Routes = Parameters<typeof stubApi>[0];
type Calls = ReturnType<typeof stubApi>;

/** Signed in to company c-1 holding `permissions` company-wide. */
const signedIn = (permissions = ["schedule:read"]): Routes => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope(schedulingWorkspace(permissions)),
	},
});

const ok = (data: unknown): StubReply => ({
	status: 200,
	body: envelope(data),
});

/**
 * Schedule s-1 deleted by Lina Tan, as the single read answers it: its frozen
 * shifts, its roster with Aisha's Monday changed by hand, and one cover offer
 * that was withdrawn. `overrides` set it apart.
 */
const recordFixture = (
	overrides: Partial<DeletedScheduleRecord> = {}
): DeletedScheduleRecord => {
	const [first, ...rest] = scheduleAssignmentsFixture();
	return {
		...deletedScheduleFixture(),
		shifts: frozenShiftsFixture(),
		assignments: [...(first ? [editedAssignmentFixture(first)] : []), ...rest],
		coverOffers: [coverOfferFixture({ status: "WITHDRAWN" })],
		...overrides,
	};
};

const openRecord = async (routes: Routes): Promise<Calls> => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const calls = stubApi(routes);
	app = await openApp(RECORD_URL);
	renderAuthApp(app);
	return calls;
};

/** Every schedule key there is, to show that holding them all still offers nothing here. */
const EVERY_SCHEDULE_KEY = [
	"schedule:read",
	"schedule:create",
	"schedule:update",
	"schedule:delete",
	"schedule:generate",
	"schedule:approve",
	"schedule:edit_shift",
	"shift:read",
];

describe("a deleted schedule's record", () => {
	it("says when and by whom it was deleted, and that nothing in it can be changed", async () => {
		await openRecord({
			...signedIn(),
			[`GET ${RECORD}`]: ok(recordFixture()),
		});

		expect(
			await screen.findByRole("heading", { name: "Front Office Schedule" })
		).toBeVisible();
		expect(screen.getByText("Deleted")).toBeVisible();
		// jsdom reads as a US browser, so the day is written month first here.
		expect(
			screen.getByText("Deleted by Lina Tan on Oct 15, 2026")
		).toBeVisible();
		expect(
			screen.getByText(
				"This roster was deleted on Oct 15, 2026. It is kept as a record: nothing in it can be changed, published or generated again. Its days are on the roster page."
			)
		).toBeVisible();
	});

	it("says a later run replaced it when that is why it was deleted", async () => {
		await openRecord({
			...signedIn(),
			[`GET ${RECORD}`]: ok(
				recordFixture({
					deletion: {
						deletedAt: "2026-10-15T03:00:00Z",
						deletedByName: "Lina Tan",
						cause: "REPLACED",
					},
				})
			),
		});

		expect(
			await screen.findByText("Replaced by a new roster on Oct 15, 2026")
		).toBeVisible();
	});

	it("shows the roster as it was, its changes and the cover offers sent", async () => {
		await openRecord({
			...signedIn(),
			[`GET ${RECORD}`]: ok(recordFixture()),
		});
		const user = userEvent.setup();

		expect(
			await screen.findByRole("button", {
				name: "Ben Ong, Fri 11:00 – 13:00",
			})
		).toBeVisible();
		await user.click(
			screen.getByRole("button", { name: "Changed by hand: 1 day" })
		);
		expect(
			screen.getByRole("complementary", { name: "Changed" })
		).toHaveTextContent("Aisha Rahman");
		const offers = screen.getByRole("region", { name: "Cover offers" });
		expect(offers).toHaveTextContent("Aisha Rahman");
		expect(offers).toHaveTextContent("Ana is off sick, can you help?");
	});

	it("offers no action, even to someone holding every schedule key", async () => {
		await openRecord({
			...signedIn(EVERY_SCHEDULE_KEY),
			[`GET ${RECORD}`]: ok(recordFixture()),
		});
		const user = userEvent.setup();

		await user.click(
			await screen.findByRole("button", {
				name: "Aisha Rahman, Tue 09:00 – 15:00",
			})
		);

		// A chosen day opens its details, never the editor.
		expect(
			screen.getByRole("complementary", { name: "Shift Details" })
		).toBeVisible();
		expect(screen.queryByRole("radio", { name: "Not working" })).toBeNull();
		expect(screen.queryByRole("button", { name: /Day off$/ })).toBeNull();
		expect(screen.queryByRole("button", { name: ACTIONS })).toBeNull();
		expect(screen.queryByRole("menuitem")).toBeNull();
		await user.click(
			screen.getByRole("button", { name: "Changed by hand: 1 day" })
		);
		expect(
			within(
				screen.getByRole("complementary", { name: "Changed" })
			).queryByRole("button", { name: ACTIONS })
		).toBeNull();
	});

	it("reads nothing from a live schedule's routes, which do not know it", async () => {
		const calls = await openRecord({
			...signedIn(EVERY_SCHEDULE_KEY),
			[`GET ${RECORD}`]: ok(recordFixture()),
		});

		await screen.findByRole("button", { name: "Ben Ong, Fri 11:00 – 13:00" });
		expect(calls.filter((call) => LIVE_ROUTES.test(call.path))).toEqual([]);
		expect(calls.filter((call) => call.method !== "GET")).toEqual(
			calls.filter((call) => call.path.endsWith("/sessions/refreshes"))
		);
	});

	it("shows an open cover offer without a way to answer or withdraw it", async () => {
		await openRecord({
			...signedIn(EVERY_SCHEDULE_KEY),
			[`GET ${RECORD}`]: ok(
				recordFixture({ coverOffers: [coverOfferFixture()] })
			),
		});

		const offers = await screen.findByRole("region", { name: "Cover offers" });
		expect(within(offers).queryByRole("button")).toBeNull();
	});

	it("leaves the cover offers out when none was sent", async () => {
		await openRecord({
			...signedIn(),
			[`GET ${RECORD}`]: ok(recordFixture({ coverOffers: [] })),
		});

		await screen.findByRole("button", { name: "Ben Ong, Fri 11:00 – 13:00" });
		expect(screen.queryByRole("region", { name: "Cover offers" })).toBeNull();
	});

	it.each([
		["without schedule:read anywhere", [], undefined],
		["the API doesn't know, or that is still live", ["schedule:read"], 404],
		["the API refuses", ["schedule:read"], 403],
	] as const)(
		"says a deleted schedule %s is not found",
		async (_, permissions, status) => {
			const calls = await openRecord({
				...signedIn([...permissions]),
				...(status && { [`GET ${RECORD}`]: { status } }),
			});

			expect(await screen.findByRole("alert")).toHaveTextContent(
				"This schedule doesn’t exist or you don’t have permission to see it."
			);
			expect(screen.queryByText("Deleted")).toBeNull();
			if (!status)
				expect(calls.filter((call) => call.path === RECORD)).toHaveLength(0);
		}
	);

	it("says the record could not be loaded when the read fails", async () => {
		// A refusal that is neither "not found" nor "not allowed", and is not asked again.
		await openRecord({
			...signedIn(),
			[`GET ${RECORD}`]: { status: 400 },
		});

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"This schedule could not be loaded. Please try again."
		);
	});
});
