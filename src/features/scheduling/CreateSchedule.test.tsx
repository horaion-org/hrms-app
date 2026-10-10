import { screen, waitFor, within } from "@testing-library/react";
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
import { scheduleFixture } from "@/features/scheduling/schedules/fixtures";
import {
	INCLUDED_SHIFT_IDS,
	SHIFT_FIXTURES,
	scheduleShiftsFixture,
} from "@/features/scheduling/shifts/fixtures";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const DEPARTMENTS = "GET /api/v1/companies/c-1/departments";
const JOB_TITLES = "GET /api/v1/companies/c-1/job-titles";
const SCHEDULES =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules";
const SCHEDULE = `${SCHEDULES}/s-1`;
const SHIFTS = `${SCHEDULE}/shifts`;
const ALL = [
	"department:read",
	"job_title:read",
	"schedule:read",
	"schedule:create",
	"schedule:update",
	"shift:read",
	"shift:create",
	"shift:update",
	"shift:delete",
];
const DRAFT = scheduleFixture();
const DRAFT_SHIFTS = scheduleShiftsFixture();
/** A reopened draft lands here. */
const REOPEN = "/scheduling/new?step=shifts&scheduleId=s-1&departmentId=d-1";

type Call = { method: string; path: string; search: string; body: unknown };

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

const page = (content: Array<unknown>): StubReply => ({
	status: 200,
	body: envelope({ content, page: { totalElements: content.length } }),
});

const reply = (data: unknown, status = 200): StubReply => ({
	status,
	body: envelope(data),
});

const workspaceReply = (permissions: Array<string>): StubReply => ({
	status: 200,
	body: envelope({
		companies: [
			{ uuid: "c-1", name: "Company c-1", permissions, branches: [] },
		],
	}),
});

const routes = (
	permissions: Array<string> = ALL
): Record<string, StubReply> => ({
	[REFRESH]: accessPassReply(),
	[ME]: currentUserReply(),
	[WORKSPACE]: workspaceReply(permissions),
	[DEPARTMENTS]: page([
		{
			departmentId: "d-1",
			branchId: "b-1",
			name: "Front Office",
			status: "ACTIVE",
		},
		{ departmentId: "d-2", branchId: "b-1", name: "Kitchen", status: "ACTIVE" },
	]),
	[`GET ${SCHEDULE}`]: reply(DRAFT),
	[`GET ${SHIFTS}`]: reply(DRAFT_SHIFTS),
	[JOB_TITLES]: page([
		{
			jobTitleId: "front-desk-staff",
			branchId: "b-1",
			branchName: "Main branch",
			departmentId: "d-1",
			departmentName: "Front Office",
			name: "Front Desk Staff",
			status: "ACTIVE",
		},
	]),
});

const open = async (
	entry: string,
	extra: Record<string, StubReply | Array<StubReply>> = {},
	permissions: Array<string> = ALL
): Promise<{ opened: OpenedApp; calls: Array<Call> }> => {
	const calls = stubApi({ ...routes(permissions), ...extra });
	app = await openApp(entry);
	renderAuthApp(app);
	return { opened: app, calls };
};

/** Opens the saved draft s-1 on its Shifts step, once its rows are shown. */
const reopen = async (
	extra: Record<string, StubReply | Array<StubReply>> = {},
	permissions: Array<string> = ALL
): Promise<{ opened: OpenedApp; calls: Array<Call> }> => {
	const opened = await open(REOPEN, extra, permissions);
	await screen.findByRole("region", { name: "Select Shifts" });
	return opened;
};

const sent = (calls: Array<Call>, route: string): Array<unknown> =>
	calls
		.filter((call) => `${call.method} ${call.path}` === route)
		.map((call) => call.body);

const next = (): HTMLElement => screen.getByRole("button", { name: "Next" });

const checkbox = (name: string): HTMLElement =>
	screen.getByRole("checkbox", { name: `Select ${name}` });

/** Opens one of the dialog's selects, picks each option and closes it. */
const pick = async (
	user: ReturnType<typeof userEvent.setup>,
	dialog: HTMLElement,
	name: RegExp,
	...labels: Array<string>
): Promise<void> => {
	await user.click(within(dialog).getByRole("button", { name }));
	await labels.reduce(
		(previous, label) =>
			previous.then(async () => {
				await user.click(await screen.findByRole("option", { name: label }));
			}),
		Promise.resolve()
	);
	if (screen.queryByRole("listbox")) await user.keyboard("{Escape}");
};

const fillSetup = async (
	user: ReturnType<typeof userEvent.setup>
): Promise<void> => {
	await user.click(await screen.findByRole("button", { name: /Department/ }));
	await user.click(await screen.findByRole("option", { name: "Front Office" }));
	await user.type(
		screen.getByRole("textbox", { name: /Schedule Name/ }),
		"Front Office - Week 42"
	);
};

describe("Create Schedule", () => {
	it("given_theSchedulingOverview_when_createClicked_then_opensSetup", async () => {
		const user = userEvent.setup();
		const { opened } = await open("/scheduling");

		await user.click(
			await screen.findByRole("link", { name: "Create Schedule" })
		);
		// The shell's first navigation into the wizard outlasts the default wait.
		expect(
			await screen.findByRole(
				"heading",
				{ level: 1, name: "Create Schedule" },
				{ timeout: 10_000 }
			)
		).toBeVisible();
		await settled(opened.router);

		expect(opened.router.state.location.pathname).toBe("/scheduling/new");
		expect(
			screen.getByRole("region", { name: "Schedule Setup" })
		).toBeVisible();
		expect(
			screen.getByRole("link", { name: "Back to Overview" })
		).toHaveAttribute("href", "/scheduling");
	});

	it("given_aLaterStepWithoutADraft_when_linkedTo_then_returnsToSetup", async () => {
		const { opened } = await open("/scheduling/new?step=forecast");

		expect(
			await screen.findByRole("region", { name: "Schedule Setup" })
		).toBeVisible();
		await settled(opened.router);
		expect(opened.router.state.location.search).toEqual({ step: "setup" });
	});

	it("given_aScheduleIdWithoutItsDepartment_when_linkedTo_then_returnsToSetup", async () => {
		const { opened, calls } = await open(
			"/scheduling/new?step=shifts&scheduleId=s-1"
		);

		expect(
			await screen.findByRole("region", { name: "Schedule Setup" })
		).toBeVisible();
		await settled(opened.router);
		expect(opened.router.state.location.search).toEqual({ step: "setup" });
		expect(calls.filter((call) => call.path === SCHEDULE)).toEqual([]);
	});

	it("given_aCompletedSetup_when_nextClicked_then_createsTheDraftAndOpensItsShifts", async () => {
		const user = userEvent.setup();
		const created = scheduleFixture();
		const { opened, calls } = await open("/scheduling/new", {
			[`POST ${SCHEDULES}`]: reply(created, 201),
			[`GET ${SCHEDULE}`]: reply(created),
			[`GET ${SHIFTS}`]: reply([]),
		});

		await fillSetup(user);
		await user.click(next());

		await screen.findByRole("region", { name: "Select Shifts" });
		expect(opened.router.state.location.search).toEqual({
			step: "shifts",
			scheduleId: "s-1",
			departmentId: "d-1",
		});
		expect(sent(calls, `POST ${SCHEDULES}`)).toEqual([
			{
				name: "Front Office - Week 42",
				periodStart: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) as string,
				includeLeave: true,
				allowOpenShifts: false,
			},
		]);
		expect(await screen.findByText("No shifts yet.")).toBeVisible();
	});

	it("given_aRefusedPeriod_when_setupCompleted_then_saysSoOnThePeriod", async () => {
		const user = userEvent.setup();
		const { opened } = await open("/scheduling/new", {
			[`POST ${SCHEDULES}`]: {
				status: 400,
				body: { errorCode: "SCHEDULE_PERIOD_NOT_MONDAY", errors: [] },
			},
		});

		await fillSetup(user);
		await user.click(next());

		expect(
			await screen.findByText("Choose a period that starts on a Monday.")
		).toBeVisible();
		expect(opened.router.state.location.search).toEqual({});
	});

	it("given_aDraftsUrl_when_reopened_then_listsItsShiftsTickedAsTheApiKeepsThem", async () => {
		const user = userEvent.setup();
		const { calls } = await reopen();

		const table = await screen.findByRole("table", { name: "Shifts" });
		expect(within(table).getAllByRole("row")).toHaveLength(
			SHIFT_FIXTURES.length + 1
		);
		for (const shift of SHIFT_FIXTURES)
			if (INCLUDED_SHIFT_IDS.includes(shift.shiftId))
				expect(checkbox(shift.name)).toBeChecked();
			else expect(checkbox(shift.name)).not.toBeChecked();
		expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual(
			expect.arrayContaining([`GET ${SCHEDULE}`, `GET ${SHIFTS}`])
		);

		await user.click(screen.getByRole("button", { name: "Back" }));

		expect(
			await screen.findByRole("textbox", { name: /Schedule Name/ })
		).toHaveValue("Front Office - Week 42");
		const department = screen.getByRole("button", { name: /Department/ });
		expect(department).toHaveTextContent("Front Office");
		expect(department).toBeDisabled();
	});

	it("given_aDraftTheApiDoesNotHave_when_opened_then_saysSo", async () => {
		await open("/scheduling/new?step=shifts&scheduleId=s-9&departmentId=d-1");

		expect(
			await screen.findByText(
				"This draft doesn’t exist or you don’t have permission to see it."
			)
		).toBeVisible();
		expect(
			screen.getByRole("link", { name: "Back to Overview" })
		).toHaveAttribute("href", "/scheduling");
		expect(screen.queryByRole("navigation", { name: "Steps" })).toBeNull();
	});

	it("given_changedTicks_when_draftSaved_then_sendsTheSetupAndThenTheInclusion", async () => {
		const user = userEvent.setup();
		const ticked = [
			"front-desk-am",
			"breakfast-prep",
			"lunch-rush",
			"overnight-ops",
		];
		const { calls } = await reopen({
			[`PUT ${SCHEDULE}`]: reply(DRAFT),
			[`PUT ${SHIFTS}/inclusion`]: reply(
				SHIFT_FIXTURES.map((shift) => ({
					...shift,
					included: ticked.includes(shift.shiftId),
				}))
			),
		});
		await screen.findByRole("row", { name: /Front Desk AM/ });

		await user.click(checkbox("Swing Shift"));
		await user.click(checkbox("Overnight Ops"));
		await user.click(screen.getByRole("button", { name: "Save Draft" }));

		await waitFor(() => {
			expect(screen.getByRole("status")).toHaveTextContent("Draft saved");
		});
		expect(sent(calls, `PUT ${SCHEDULE}`)).toEqual([
			{
				name: "Front Office - Week 42",
				periodStart: "2026-10-12",
				includeLeave: true,
				allowOpenShifts: false,
			},
		]);
		expect(sent(calls, `PUT ${SHIFTS}/inclusion`)).toEqual([
			{ includedShiftIds: ticked },
		]);
		expect(
			calls.filter((call) => call.method === "PUT").map((call) => call.path)
		).toEqual([SCHEDULE, `${SHIFTS}/inclusion`]);
	});

	it("given_aSavedDraft_when_setupCompletedAgain_then_replacesItsSetup", async () => {
		const user = userEvent.setup();
		const { opened, calls } = await open(
			"/scheduling/new?step=setup&scheduleId=s-1&departmentId=d-1",
			{ [`PUT ${SCHEDULE}`]: reply(DRAFT) }
		);
		const name = await screen.findByRole("textbox", { name: /Schedule Name/ });

		await user.clear(name);
		await user.type(name, "Front Office - Late Week");
		await user.click(next());

		await screen.findByRole("region", { name: "Select Shifts" });
		expect(opened.router.state.location.search).toEqual({
			step: "shifts",
			scheduleId: "s-1",
			departmentId: "d-1",
		});
		expect(sent(calls, `PUT ${SCHEDULE}`)).toEqual([
			{
				name: "Front Office - Late Week",
				periodStart: "2026-10-12",
				includeLeave: true,
				allowOpenShifts: false,
			},
		]);
		expect(sent(calls, `POST ${SCHEDULES}`)).toEqual([]);
		expect(sent(calls, `PUT ${SHIFTS}/inclusion`)).toEqual([]);
	});

	it("given_everyStep_when_completed_then_reachesGenerateWithTheSummary", async () => {
		const user = userEvent.setup();
		await reopen();
		await screen.findByRole("row", { name: /Front Desk AM/ });

		await user.click(next());
		await screen.findByRole("region", { name: "Scheduling Constraints" });
		await user.click(next());
		await screen.findByRole("region", { name: "Staffing Forecast" });
		// Nothing is allocated until the person says so.
		expect(screen.getAllByText("0 staff allocated")[0]).toBeVisible();
		await user.click(
			screen.getByRole("button", { name: "More Front Desk Lead" })
		);
		await user.click(next());

		await screen.findByRole("region", { name: "Ready to Generate" });
		const summary = screen.getByLabelText("Schedule summary");
		// Four shifts with eleven roles between them; one role has someone.
		expect(
			within(summary)
				.getAllByRole("definition")
				.map((value) => value.textContent)
		).toEqual(["4", "11", "9%"]);
		const generate = screen.getByRole("button", { name: "Generate" });
		expect(generate).toBeDisabled();
		expect(generate).toHaveAccessibleDescription(
			"Generating schedules isn’t available yet."
		);
		expect(screen.getByRole("button", { name: "Save Draft" })).toBeEnabled();
	});

	it("given_noShiftsChosen_when_nextClicked_then_staysAndSaysWhy", async () => {
		const user = userEvent.setup();
		const { opened } = await reopen({
			[`GET ${SHIFTS}`]: reply(
				SHIFT_FIXTURES.map((shift) => ({ ...shift, included: false }))
			),
		});
		await screen.findByRole("row", { name: /Front Desk AM/ });

		await user.click(next());

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Choose at least one shift to include in this schedule."
		);
		expect(opened.router.state.location.search).toEqual({
			step: "shifts",
			scheduleId: "s-1",
			departmentId: "d-1",
		});
	});

	it("given_aShift_when_addedThroughTheDialog_then_postsItUnderTheScheduleAndIncludesIt", async () => {
		const user = userEvent.setup();
		const created = {
			...SHIFT_FIXTURES[0],
			shiftId: "s-new",
			name: "Evening Desk",
			group: "Evening",
		};
		const { calls } = await reopen({
			[`POST ${SHIFTS}`]: reply(created, 201),
			// The shifts reload after the save; from then on they include the new one.
			[`GET ${SHIFTS}`]: [
				reply(DRAFT_SHIFTS),
				reply([...DRAFT_SHIFTS, created]),
			],
		});
		await screen.findByRole("row", { name: /Front Desk AM/ });

		await user.click(screen.getByRole("button", { name: "Add Custom Shift" }));
		const dialog = await screen.findByRole("dialog", {
			name: "Add Custom Shift",
		});
		await user.type(
			within(dialog).getByLabelText("Shift Name"),
			"Evening Desk"
		);
		await user.click(
			within(dialog).getByRole("button", { name: /Shift Group/ })
		);
		await user.type(screen.getByRole("combobox"), "Evening");
		await user.click(screen.getByRole("option", { name: 'Create "Evening"' }));
		await user.click(within(dialog).getByRole("radio", { name: "Slate" }));
		await pick(user, dialog, /Start Time/, "17:00");
		await pick(user, dialog, /End Time/, "23:00");
		await pick(user, dialog, /Days Applied To/, "Monday");
		await waitFor(() => {
			expect(
				within(dialog).getByRole("button", { name: /Roles Applied To/ })
			).toBeEnabled();
		});
		await pick(user, dialog, /Roles Applied To/, "Front Desk Staff");
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(screen.getByRole("status")).toHaveTextContent("Shift added");
		});
		// The shifts reload with the new one, ticked, under a tab for its group.
		await screen.findByRole("row", { name: /Evening Desk/ });
		expect(checkbox("Evening Desk")).toBeChecked();
		await user.click(screen.getByRole("tab", { name: /Evening/ }));
		expect(
			within(screen.getByRole("table", { name: "Shifts" })).getAllByRole("row")
		).toHaveLength(2);
		expect(sent(calls, `POST ${SHIFTS}`)).toEqual([
			{
				name: "Evening Desk",
				group: "Evening",
				colour: "#6E72A5",
				startTime: "17:00",
				endTime: "23:00",
				days: ["MON"],
				jobTitleIds: ["front-desk-staff"],
			},
		]);
	});

	it("given_aConstraint_when_deleted_then_removesItAndConfirms", async () => {
		const user = userEvent.setup();
		await reopen();
		await screen.findByRole("row", { name: /Front Desk AM/ });
		await user.click(next());
		await screen.findByRole("region", { name: "Scheduling Constraints" });

		await user.click(
			screen.getByRole("button", { name: "Delete Rest Between Shifts" })
		);

		expect(
			screen.queryByRole("row", { name: /Rest Between Shifts/ })
		).toBeNull();
		await waitFor(() => {
			expect(screen.getByRole("status")).toHaveTextContent(
				"Constraint successfully deleted"
			);
		});
	});

	it("given_aShift_when_deleted_then_asksTheApiAndConfirms", async () => {
		const user = userEvent.setup();
		const { calls } = await reopen({
			[`DELETE ${SHIFTS}/overnight-ops`]: { status: 204 },
		});
		await screen.findByRole("row", { name: /Overnight Ops/ });

		await user.click(
			screen.getByRole("button", { name: "Delete Overnight Ops" })
		);

		await waitFor(() => {
			expect(screen.getByRole("status")).toHaveTextContent(
				"Shift successfully deleted"
			);
		});
		expect(
			calls.filter((call) => call.method === "DELETE").map((call) => call.path)
		).toEqual([`${SHIFTS}/overnight-ops`]);
	});

	it("given_aShift_when_editedThroughTheDialog_then_putsItUnderTheSchedule", async () => {
		const user = userEvent.setup();
		const { calls } = await reopen({
			[`PUT ${SHIFTS}/front-desk-am`]: reply({
				...DRAFT_SHIFTS[0],
				name: "Front Desk Early",
			}),
		});
		await screen.findByRole("row", { name: /Front Desk AM/ });

		await user.click(
			screen.getByRole("button", { name: "Edit Front Desk AM" })
		);
		const dialog = await screen.findByRole("dialog", { name: "Edit Shift" });
		const name = within(dialog).getByLabelText("Shift Name");
		await user.clear(name);
		await user.type(name, "Front Desk Early");
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(screen.getByRole("status")).toHaveTextContent("Shift saved");
		});
		expect(sent(calls, `PUT ${SHIFTS}/front-desk-am`)).toEqual([
			expect.objectContaining({ name: "Front Desk Early" }),
		]);
	});

	it("given_noShiftReadKey_when_onTheShiftsStep_then_saysTheShiftsAreHidden", async () => {
		const { calls } = await reopen({}, ["department:read", "schedule:read"]);

		expect(
			await screen.findByText(
				"You don’t have permission to see this schedule’s shifts."
			)
		).toBeVisible();
		expect(screen.queryByRole("table", { name: "Shifts" })).toBeNull();
		expect(calls.filter((call) => call.path === SHIFTS)).toEqual([]);
	});

	it("given_onlyShiftRead_when_onTheShiftsStep_then_listsThemButOffersNoChanges", async () => {
		await reopen({}, ["department:read", "schedule:read", "shift:read"]);
		await screen.findByRole("row", { name: /Front Desk AM/ });

		expect(
			screen.queryByRole("button", { name: "Add Custom Shift" })
		).toBeNull();
		expect(screen.queryByRole("button", { name: /^Edit / })).toBeNull();
		expect(screen.queryByRole("button", { name: /^Delete / })).toBeNull();
		expect(screen.queryByRole("button", { name: "Save Draft" })).toBeNull();
	});
});
