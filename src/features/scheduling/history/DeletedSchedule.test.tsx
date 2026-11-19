import { screen, waitFor, within } from "@testing-library/react";
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
	generatedScheduleFixture,
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
/** Putting the deleted schedule back, at its department. */
const RESTORATION =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1/restoration";
const PUT_BACK = "Put back on the roster";

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

	it("offers no action of a live roster, even to someone holding every schedule key", async () => {
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

	it.each([
		["none was sent", []],
		// The API sends null to a reader without schedule:edit_shift at the Department.
		["the reader may not read them", null],
	] as const)("leaves the cover offers out when %s", async (_, coverOffers) => {
		await openRecord({
			...signedIn(),
			[`GET ${RECORD}`]: ok(
				recordFixture({ coverOffers: coverOffers && [...coverOffers] })
			),
		});

		// The record still opens: its roster shows, without the Cover offers part.
		await screen.findByRole("button", { name: "Ben Ong, Fri 11:00 – 13:00" });
		expect(screen.queryByRole("region", { name: "Cover offers" })).toBeNull();
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it.each([
		["no name", "MANAGER", null],
		["no cause", null, "Lina Tan"],
		["neither who nor why", null, null],
	] as const)(
		"says only when it was deleted, given %s",
		async (_, cause, deletedByName) => {
			await openRecord({
				...signedIn(),
				[`GET ${RECORD}`]: ok(
					recordFixture({
						deletion: {
							deletedAt: "2026-10-15T03:00:00Z",
							deletedByName,
							cause,
						},
					})
				),
			});

			expect(await screen.findByText("Deleted on Oct 15, 2026")).toBeVisible();
			expect(screen.queryByText(/Deleted by/)).toBeNull();
		}
	);

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

/** A 409 as the API sends it, with the rosters in the way in its details when given. */
const refused = (errorCode: string, inTheWay?: Array<unknown>): StubReply => ({
	status: 409,
	body: {
		status: 409,
		title: "Refused",
		detail: `API says ${errorCode}`,
		errorCode,
		...(inTheWay && { details: { inTheWay } }),
	},
});

/** The record opened by someone who may delete at its department, with Put back pressed. */
const openPutBackDialog = async (routes: Routes): Promise<Calls> => {
	const calls = await openRecord({
		...signedIn(["schedule:read", "schedule:delete"]),
		[`GET ${RECORD}`]: ok(recordFixture()),
		...routes,
	});
	await userEvent.click(await screen.findByRole("button", { name: PUT_BACK }));
	return calls;
};

const restorationsOf = (calls: Calls): Calls =>
	calls.filter((call) => call.path === RESTORATION);

describe("putting a deleted schedule back", () => {
	it("offers Put back for a roster a manager deleted, to someone who may delete there", async () => {
		await openRecord({
			...signedIn(["schedule:read", "schedule:delete"]),
			[`GET ${RECORD}`]: ok(recordFixture()),
		});

		expect(await screen.findByRole("button", { name: PUT_BACK })).toBeVisible();
	});

	it.each([
		[
			"without schedule:delete",
			["schedule:read", "schedule:edit_shift"],
			"MANAGER",
		],
		[
			"for a roster a run replaced",
			["schedule:read", "schedule:delete"],
			"REPLACED",
		],
		[
			"for a roster with no cause recorded",
			["schedule:read", "schedule:delete"],
			null,
		],
	] as const)("does not offer it %s", async (_, permissions, cause) => {
		await openRecord({
			...signedIn([...permissions]),
			[`GET ${RECORD}`]: ok(
				recordFixture({
					deletion: {
						deletedAt: "2026-10-15T03:00:00Z",
						deletedByName: "Lina Tan",
						cause,
					},
				})
			),
		});

		await screen.findByRole("button", { name: "Ben Ong, Fri 11:00 – 13:00" });
		expect(screen.queryByRole("button", { name: PUT_BACK })).toBeNull();
	});

	it("asks first, and Cancel puts nothing back", async () => {
		const calls = await openPutBackDialog({});

		const dialog = screen.getByRole("dialog", {
			name: "Put this roster back?",
		});
		expect(dialog).toHaveTextContent(
			"go back on the roster page as a roster to review, as it was when it was deleted. It is not published: staff see nothing until you publish it."
		);
		expect(dialog).toHaveTextContent(
			"If it was waiting for approval, send it for approval again."
		);
		// Never published, so nothing is said about staff having seen it.
		expect(dialog).not.toHaveTextContent("Staff saw this roster");
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Cancel" })
		);

		expect(screen.queryByRole("dialog")).toBeNull();
		expect(restorationsOf(calls)).toHaveLength(0);
	});

	it("says staff saw a roster that was once published", async () => {
		await openPutBackDialog({
			[`GET ${RECORD}`]: ok(
				recordFixture({
					wasPublished: true,
					publicationWithdrawnAt: "2026-10-14T02:00:00Z",
				})
			),
		});

		expect(
			screen.getByRole("dialog", { name: "Put this roster back?" })
		).toHaveTextContent("Staff saw this roster before it was withdrawn.");
	});

	it("puts it back once, without the replace flag, and opens the department's roster page on its week", async () => {
		const calls = await openPutBackDialog({
			[`POST ${RESTORATION}`]: ok(
				generatedScheduleFixture({ status: "GENERATED" })
			),
		});

		await userEvent.click(screen.getByRole("button", { name: "Put back" }));

		await waitFor(() => {
			expect(app?.router.state.location.pathname).toBe(
				"/scheduling/department"
			);
		});
		expect(app?.router.state.location.search).toMatchObject({
			department: "d-1",
			from: "2026-10-12",
		});
		expect(restorationsOf(calls)).toHaveLength(1);
		expect(restorationsOf(calls)[0]?.body).toBeUndefined();
	});

	it("warns before replacing a roster to review, and replaces it only on the second confirm", async () => {
		const calls = await openPutBackDialog({
			[`POST ${RESTORATION}`]: [
				refused("SCHEDULE_PUT_BACK_WOULD_REPLACE", [
					{
						scheduleId: "s-7",
						coveredFrom: "2026-10-12",
						coveredTo: "2026-10-14",
						replaceable: true,
						laterInTheWeek: false,
					},
				]),
				ok(generatedScheduleFixture({ status: "GENERATED" })),
			],
		});

		await userEvent.click(screen.getByRole("button", { name: "Put back" }));

		const warning = await screen.findByRole("dialog", {
			name: "Replace the roster to review?",
		});
		expect(warning).toHaveTextContent(
			/If you put this roster back, the roster to review on Oct 12\s?–\s?14, 2026 will be deleted\. It goes to History, where you can put it back later\./
		);
		// The roster in the way lies inside this one's week, so no day is left empty.
		expect(warning).not.toHaveTextContent("will then have no roster");
		expect(restorationsOf(calls)).toHaveLength(1);
		expect(restorationsOf(calls)[0]?.body).toBeUndefined();

		await userEvent.click(
			within(warning).getByRole("button", { name: "Put back and replace" })
		);

		await waitFor(() => {
			expect(app?.router.state.location.pathname).toBe(
				"/scheduling/department"
			);
		});
		expect(restorationsOf(calls)).toHaveLength(2);
		expect(restorationsOf(calls)[1]?.body).toEqual({
			replaceRostersInTheWay: true,
		});
	});

	it("names the days left with no roster when the roster in the way covers more than this one", async () => {
		await openPutBackDialog({
			[`GET ${RECORD}`]: ok(
				recordFixture({ coveredFrom: "2026-10-14", coveredTo: "2026-10-18" })
			),
			[`POST ${RESTORATION}`]: refused("SCHEDULE_PUT_BACK_WOULD_REPLACE", [
				{
					scheduleId: "s-7",
					coveredFrom: "2026-10-12",
					coveredTo: "2026-10-15",
					replaceable: true,
					laterInTheWeek: false,
				},
			]),
		});

		await userEvent.click(screen.getByRole("button", { name: "Put back" }));

		expect(
			await screen.findByRole("dialog", {
				name: "Replace the roster to review?",
			})
		).toHaveTextContent(
			/roster to review on Oct 12\s?–\s?15, 2026 will be deleted\..*Oct 12\s?–\s?13, 2026 will then have no roster\./
		);
	});

	it("lets the warning be cancelled, replacing nothing", async () => {
		const calls = await openPutBackDialog({
			[`POST ${RESTORATION}`]: refused("SCHEDULE_PUT_BACK_WOULD_REPLACE", []),
		});
		await userEvent.click(screen.getByRole("button", { name: "Put back" }));
		const warning = await screen.findByRole("dialog", {
			name: "Replace the roster to review?",
		});

		await userEvent.click(
			within(warning).getByRole("button", { name: "Cancel" })
		);

		expect(screen.queryByRole("dialog")).toBeNull();
		expect(restorationsOf(calls)).toHaveLength(1);
		expect(app?.router.state.location.pathname).toBe(RECORD_URL);
	});

	it.each([
		[
			"a published or generating roster on its days",
			refused("SCHEDULE_PUT_BACK_DAYS_TAKEN", [
				{
					scheduleId: "s-7",
					coveredFrom: "2026-10-12",
					coveredTo: "2026-10-14",
					replaceable: false,
					laterInTheWeek: false,
				},
			]),
			/This roster can’t be put back: Oct 12\s?–\s?14, 2026 hold a published roster or one being generated\. Withdraw the published roster or wait for the generation to end, then put it back\./,
		],
		[
			"days taken with no list of what is in the way",
			refused("SCHEDULE_PUT_BACK_DAYS_TAKEN"),
			/This roster can’t be put back: its days hold a published roster or one being generated, or later days in the same week were worked out without it\./,
		],
		[
			"a roster a run replaced",
			refused("SCHEDULE_NOT_RESTORABLE"),
			/This roster can’t be put back: a newer roster replaced it\. Generate its days again from the Generate page instead\./,
		],
	] as const)(
		"says why it was refused for %s, and keeps the dialog open",
		async (_, reply, sentence) => {
			const calls = await openPutBackDialog({
				[`POST ${RESTORATION}`]: reply,
			});

			await userEvent.click(screen.getByRole("button", { name: "Put back" }));

			expect(await screen.findByText(sentence)).toBeVisible();
			expect(
				screen.getByRole("dialog", { name: "Put this roster back?" })
			).toBeVisible();
			expect(restorationsOf(calls)).toHaveLength(1);
			expect(app?.router.state.location.pathname).toBe(RECORD_URL);
		}
	);
});
