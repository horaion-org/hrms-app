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
import { companyWideWorkspace } from "@/common/testing/effectiveWorkspace";
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
	FIVE_DAY_WEEK,
	overviewResponse,
	SIX_DAY_SHIFT,
	TERMS_OVERVIEW_RESPONSE,
	TERMS_PRESETS,
} from "@/features/employmentTerms/fixtures";

const TERMS = "/api/v1/companies/c-1/employment-terms";
const READ_AND_UPDATE = ["employment_terms:read", "employment_terms:update"];

// The router splits each page's code out; loading it once here keeps that
// first load out of the first test's time.
beforeAll(async () => {
	await import("@/pages/Settings");
});
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

const routes = (
	permissions: Array<string>,
	extra: Record<string, StubReply | Array<StubReply>> = {}
): Record<string, StubReply | Array<StubReply>> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope(companyWideWorkspace(permissions)),
	},
	[`GET ${TERMS}/overview`]: {
		status: 200,
		body: envelope(TERMS_OVERVIEW_RESPONSE),
	},
	[`GET ${TERMS}/presets`]: { status: 200, body: envelope(TERMS_PRESETS) },
	...extra,
});

const open = async (
	path = "/settings?section=employment"
): Promise<HTMLElement> => {
	app = await openApp(path);
	renderAuthApp(app);
	return screen.findByRole("region", { name: "Employment terms" });
};

const table = (panel: HTMLElement): Promise<HTMLElement> =>
	within(panel).findByRole("table", { name: "Employment terms" });

describe("EmploymentTermsSettings", () => {
	it("lists the terms with their week, people and the Default for new people", async () => {
		stubApi(routes(READ_AND_UPDATE));
		const panel = await open();

		const rows = await table(panel);
		const standard = within(rows).getByRole("row", { name: /Standard week/ });
		expect(standard).toHaveTextContent("44 h over 6 days");
		expect(standard).toHaveTextContent("Roster picks the rest day");
		expect(standard).toHaveTextContent("Overtime after 44 h a week");
		expect(standard).toHaveTextContent("Default");
		// Shift work and part-time say so beside the name, with how overtime counts.
		const shift = within(rows).getByRole("row", { name: /Six-day shift/ });
		expect(within(shift).getByText("Shift work")).toBeVisible();
		expect(shift).toHaveTextContent("Overtime by the week, after 44 h");
		const partTime = within(rows).getByRole("row", { name: /Part-time, 20 h/ });
		expect(within(partTime).getByText("Part-time")).toBeVisible();
		expect(partTime).toHaveTextContent("Extra hours up to 44 h, then overtime");
		expect(
			within(rows).getByRole("row", { name: /Six-day shift/ })
		).toHaveTextContent("41 people+2 from a later date");
		// No one is described as following the Default: everyone has terms.
		expect(panel).not.toHaveTextContent(/of their own|counted under/);
		expect(
			within(panel).getByRole("link", { name: "Work policy" })
		).toHaveAttribute("href", "/settings?section=scheduling");
	});

	it("links each count to the People list filtered to those terms, across every Branch", async () => {
		stubApi(
			routes([
				"employment_terms:read",
				"member_profile:read",
				"member_employment_terms:read",
			])
		);
		const panel = await open();

		const rows = await table(panel);
		const sixDay = within(rows).getByRole("row", { name: /Six-day shift/ });
		// The phone's summary line repeats the column's link; both go to the same list.
		const [link] = within(sixDay).getAllByRole("link", {
			name: "Show the people on Six-day shift, 12 h",
		});
		expect(link).toHaveAttribute(
			"href",
			`/people?branch=all&terms=${SIX_DAY_SHIFT.id}`
		);
		expect(link).toHaveTextContent("41 people");
	});

	it("shows the counts as plain text to someone who cannot list people's terms company-wide", async () => {
		stubApi(routes(["employment_terms:read", "member_profile:read"]));
		const panel = await open();

		const rows = await table(panel);
		const sixDay = within(rows).getByRole("row", { name: /Six-day shift/ });
		expect(sixDay).toHaveTextContent("41 people");
		expect(within(sixDay).queryByRole("link")).toBeNull();
	});

	it("offers no changes without employment_terms:update", async () => {
		stubApi(routes(["employment_terms:read"]));
		const panel = await open();

		await table(panel);
		expect(
			within(panel).queryByRole("button", { name: "Add employment terms" })
		).toBeNull();
		expect(within(panel).queryByRole("button", { name: /^Edit / })).toBeNull();
	});

	it("is not offered without employment_terms:read", async () => {
		stubApi(routes(["scheduling_policy:read"]));
		app = await openApp("/settings");
		renderAuthApp(app);

		await screen.findByRole("link", { name: "Work policy" });
		expect(screen.queryByRole("link", { name: "Employment terms" })).toBeNull();
	});

	it("adds terms from a common week, reading them back as they change", async () => {
		const calls = stubApi(
			routes(READ_AND_UPDATE, {
				[`POST ${TERMS}`]: { status: 201, body: envelope(FIVE_DAY_WEEK) },
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(panel).findByRole("button", { name: "Add employment terms" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Add employment terms",
		});
		// New terms open on the first kind, its figures filled in and read back in words.
		expect(
			await within(dialog).findByRole("radio", { name: /Fixed hours, 5 days/ })
		).toBeChecked();
		expect(dialog).toHaveTextContent(
			"Works 44 hours over 5 days a week, 8 hours 48 minutes a day. Sunday is the rest day, every week. Overtime starts after 8 hours 48 minutes in a day or 44 hours in a week. Employment Act hour limits apply: rosters keep them within the work-hour limits."
		);
		expect(within(dialog).getByLabelText("Normal hours a day")).toHaveValue(
			"8:48"
		);
		expect(within(dialog).getByLabelText("Name")).toHaveValue(
			"5-day week, 44 h"
		);

		// Choosing a kind changes the fields and the sentence at once.
		await user.click(within(dialog).getByRole("radio", { name: /Shift work/ }));
		expect(dialog).toHaveTextContent("in shifts of up to 12 hours");
		expect(within(dialog).getByLabelText("Longest shift")).toHaveValue("12");
		await user.click(
			within(dialog).getByRole("radio", { name: /Fixed hours, 5 days/ })
		);

		// While the week is empty, the read-back says so instead of a wrong sentence.
		await user.clear(within(dialog).getByLabelText("Normal hours a week"));
		expect(dialog).toHaveTextContent(
			"Not finished yet: fill in or check the normal hours a week."
		);
		await user.type(within(dialog).getByLabelText("Normal hours a week"), "42");
		expect(dialog).toHaveTextContent(
			"8 hours 48 minutes in a day or 42 hours in a week"
		);
		expect(within(dialog).getByLabelText("Name")).toHaveValue(
			"5-day week, 42 h"
		);

		await user.click(
			within(dialog).getByRole("button", { name: "Add employment terms" })
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).toBeNull();
		});
		expect(
			calls.find((call) => call.method === "POST" && call.path === TERMS)?.body
		).toEqual({
			name: "5-day week, 42 h",
			description: null,
			daysPerWeek: 5,
			weekMinutes: 2520,
			dayMinutes: 528,
			restDay: "SUN",
			dailyOvertime: true,
			shiftWork: false,
			hoursLimitsApply: true,
			overtimePercent: 150,
			restDayWorkPercent: 200,
			dayOffWorkPercent: null,
			extraHoursPaidAs: "RATE",
		});
		expect(await screen.findByText("Employment terms added")).toBeVisible();
	});

	describe("the pay for extra hours", () => {
		/** Opens Add employment terms once the first kind has filled the form. */
		const openAdd = async (panel: HTMLElement): Promise<HTMLElement> => {
			const user = userEvent.setup();
			await user.click(
				await within(panel).findByRole("button", {
					name: "Add employment terms",
				})
			);
			const dialog = await screen.findByRole("dialog", {
				name: "Add employment terms",
			});
			expect(
				await within(dialog).findByRole("radio", { name: /Fixed hours, 5 days/ })
			).toBeChecked();
			return dialog;
		};

		it("given_newTerms_when_opened_then_overtimeIs1Point5AndRestDay2", async () => {
			stubApi(routes(READ_AND_UPDATE));
			const dialog = await openAdd(await open());

			expect(
				within(dialog).getByLabelText("An overtime hour is paid at")
			).toHaveValue("1.5");
			expect(
				within(dialog).getByLabelText("Work on the rest day counts at")
			).toHaveValue("2");
			expect(dialog).toHaveTextContent(
				"The legal minimum is 1.5. You can pay more."
			);
		});

		it("given_1Point2Covered_when_saved_then_errorAtTheField", async () => {
			const calls = stubApi(routes(READ_AND_UPDATE));
			const user = userEvent.setup();
			const dialog = await openAdd(await open());

			const rate = within(dialog).getByLabelText("An overtime hour is paid at");
			await user.clear(rate);
			await user.type(rate, "1.2");
			await user.click(
				within(dialog).getByRole("button", { name: "Add employment terms" })
			);

			expect(
				await within(dialog).findByText(
					"Staff covered by the Employment Act’s hour rules are paid at least 1.5 times for overtime. Enter 1.5 or more, or say these terms are not under the Act’s hour rules if they are for managers or executives."
				)
			).toBeVisible();
			expect(
				calls.some((call) => call.method === "POST" && call.path === TERMS)
			).toBe(false);
		});

		it("given_notCovered_when_nothingExtraChosen_then_rateHidden", async () => {
			stubApi(
				routes(READ_AND_UPDATE, {
					[`GET ${TERMS}/overview`]: {
						status: 200,
						body: envelope(
							overviewResponse([{ ...FIVE_DAY_WEEK, hoursLimitsApply: false }])
						),
					},
				})
			);
			const user = userEvent.setup();
			const panel = await open();
			await user.click(
				await within(await table(panel)).findByRole("button", {
					name: "Edit Five-day week, 44 h",
				})
			);
			const dialog = await screen.findByRole("dialog", {
				name: "Edit employment terms",
			});
			expect(dialog).toHaveTextContent(
				"No legal minimum for staff outside the Act’s hour rules."
			);

			await user.click(within(dialog).getByRole("radio", { name: /Nothing extra/ }));

			expect(
				within(dialog).queryByLabelText("An overtime hour is paid at")
			).toBeNull();
		});

		it("given_saved_when_posted_then_sends150And200", async () => {
			const calls = stubApi(
				routes(READ_AND_UPDATE, {
					[`POST ${TERMS}`]: { status: 201, body: envelope(FIVE_DAY_WEEK) },
				})
			);
			const user = userEvent.setup();
			const dialog = await openAdd(await open());

			await user.click(
				within(dialog).getByRole("button", { name: "Add employment terms" })
			);

			await waitFor(() => {
				expect(screen.queryByRole("dialog")).toBeNull();
			});
			expect(
				calls.find((call) => call.method === "POST" && call.path === TERMS)?.body
			).toMatchObject({
				overtimePercent: 150,
				restDayWorkPercent: 200,
				dayOffWorkPercent: null,
				extraHoursPaidAs: "RATE",
			});
		});

		it("given_theApiRefusesTheRate_when_saved_then_itsMessageShowsAtTheField", async () => {
			stubApi(
				routes(READ_AND_UPDATE, {
					[`POST ${TERMS}`]: {
						status: 400,
						body: {
							status: 400,
							title: "Refused",
							errorCode: "INVALID_EMPLOYMENT_TERMS",
							errors: [{ field: "overtimePercent", message: "server prose" }],
						},
					},
				})
			);
			const user = userEvent.setup();
			const dialog = await openAdd(await open());

			await user.click(
				within(dialog).getByRole("button", { name: "Add employment terms" })
			);

			expect(
				await within(dialog).findByText(
					"Enter an overtime rate from 0 to 10 times a normal hour, and at least the legal minimum for staff under the Act’s hour rules."
				)
			).toBeVisible();
			expect(within(dialog).queryByText("server prose")).toBeNull();
		});
	});

	it("explains what is wrong before saving, and sends nothing", async () => {
		const calls = stubApi(routes(READ_AND_UPDATE));
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(panel).findByRole("button", { name: "Add employment terms" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Add employment terms",
		});
		const day = await within(dialog).findByLabelText("Normal hours a day");
		await user.clear(day);
		await user.type(day, "12:30");
		const week = within(dialog).getByLabelText("Normal hours a week");
		await user.clear(week);
		await user.type(week, "8.33");
		await user.click(
			within(dialog).getByRole("button", { name: "Add employment terms" })
		);

		expect(
			await within(dialog).findByText("Enter 30 min to 12 h.")
		).toBeVisible();
		expect(
			within(dialog).getByText("Use whole minutes, such as 8:30 or 8:45.")
		).toBeVisible();
		expect(dialog).toHaveTextContent(
			"Not finished yet: fill in or check the normal hours a week and the normal hours a day."
		);
		expect(
			calls.some((call) => call.method === "POST" && call.path === TERMS)
		).toBe(false);
	});

	it("says what is wrong at the field as soon as it is left, before saving", async () => {
		const calls = stubApi(routes(READ_AND_UPDATE));
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(panel).findByRole("button", { name: "Add employment terms" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Add employment terms",
		});
		await within(dialog).findByRole("radio", { name: /Fixed hours, 5 days/ });
		const week = within(dialog).getByLabelText("Normal hours a week");
		await user.clear(week);
		await user.type(week, "abc");
		await user.tab();

		expect(
			await within(dialog).findByText(
				"Enter hours such as 8, or hours and minutes such as 8:30."
			)
		).toBeVisible();
		expect(week).toHaveAttribute("aria-invalid", "true");
		// The read-back says the same, in the footer beside the buttons, never over the field.
		expect(dialog).toHaveTextContent(
			"Not finished yet: fill in or check the normal hours a week."
		);
		expect(
			calls.some((call) => call.method === "POST" && call.path === TERMS)
		).toBe(false);
	});

	it("asks how a change to held terms applies, and changes them from a Monday", async () => {
		const calls = stubApi(
			routes(READ_AND_UPDATE, {
				[`POST ${TERMS}/${SIX_DAY_SHIFT.id}/changes`]: {
					status: 201,
					body: envelope({
						previousTerms: SIX_DAY_SHIFT,
						newTerms: {
							...SIX_DAY_SHIFT,
							id: "new",
							name: "Six-day shift, 42 h",
						},
						moved: 41,
						ownHoursCleared: 2,
					}),
				},
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(await table(panel)).findByRole("button", {
				name: "Edit Six-day shift, 12 h",
			})
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Edit employment terms",
		});
		expect(dialog).toHaveTextContent("43 people have these terms.");
		await user.clear(within(dialog).getByLabelText("Normal hours a week"));
		await user.type(within(dialog).getByLabelText("Normal hours a week"), "42");
		await user.click(
			within(dialog).getByRole("button", { name: "Save changes" })
		);

		const step = await screen.findByRole("dialog", {
			name: "How should this change apply?",
		});
		expect(
			within(step).getByRole("radio", { name: /Correct it for everyone/ })
		).toBeChecked();
		await user.click(
			within(step).getByRole("radio", { name: /Change from a date/ })
		);
		expect(step).toHaveTextContent(
			/Six-day shift, 12 h keeps today’s figures for weeks before .+\. Six-day shift, 42 h gets the new figures, and the 43 people on Six-day shift, 12 h move to it from .+\. Changes already planned onto Six-day shift, 12 h after that date move to Six-day shift, 42 h too\./
		);
		expect(step).not.toHaveTextContent("default for new people");
		expect(within(step).getByLabelText("Name of the new terms")).toHaveValue(
			"Six-day shift, 42 h"
		);
		await user.click(within(step).getByRole("button", { name: "Save change" }));

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).toBeNull();
		});
		expect(
			await screen.findByText(
				/^Six-day shift, 42 h added\. 41 people move to them from .+\. Own hours were cleared for 2 people whose hours were above the new week\.$/
			)
		).toBeVisible();
		const sent = calls.find(
			(call) => call.method === "POST" && call.path.endsWith("/changes")
		)?.body as {
			startsOn: string;
			newTerms: { name: string; weekMinutes: number };
			previousTermsName?: string;
		};
		expect(sent.newTerms).toMatchObject({
			name: "Six-day shift, 42 h",
			weekMinutes: 2520,
		});
		expect(new Date(`${sent.startsOn}T00:00:00`).getDay()).toBe(1);
		// The form kept the old name, so the terms left behind aren't renamed.
		expect(sent).not.toHaveProperty("previousTermsName");
		expect(calls.some((call) => call.method === "PUT")).toBe(false);
	});

	it("keeps the save step open and says why when the new name is taken", async () => {
		stubApi(
			routes(READ_AND_UPDATE, {
				[`POST ${TERMS}/${SIX_DAY_SHIFT.id}/changes`]: problemReply(
					409,
					"EMPLOYMENT_TERMS_NAME_TAKEN"
				),
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(await table(panel)).findByRole("button", {
				name: "Edit Six-day shift, 12 h",
			})
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Edit employment terms",
		});
		await user.clear(within(dialog).getByLabelText("Normal hours a week"));
		await user.type(within(dialog).getByLabelText("Normal hours a week"), "42");
		await user.click(
			within(dialog).getByRole("button", { name: "Save changes" })
		);
		const step = await screen.findByRole("dialog", {
			name: "How should this change apply?",
		});
		await user.click(
			within(step).getByRole("radio", { name: /Change from a date/ })
		);
		await user.click(within(step).getByRole("button", { name: "Save change" }));

		expect(
			await within(step).findByText(
				"Employment terms named “Six-day shift, 42 h” already exist. Choose another name."
			)
		).toBeVisible();
	});

	it("places each rule the API finds broken on its field", async () => {
		stubApi(
			routes(READ_AND_UPDATE, {
				[`POST ${TERMS}`]: {
					status: 400,
					body: {
						status: 400,
						title: "Refused",
						errorCode: "INVALID_EMPLOYMENT_TERMS",
						errors: [
							{ field: "weekMinutes", message: "server prose" },
							{ field: "dayMinutes", message: "server prose" },
						],
					},
				},
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(panel).findByRole("button", { name: "Add employment terms" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Add employment terms",
		});
		expect(
			await within(dialog).findByRole("radio", { name: /Fixed hours, 5 days/ })
		).toBeChecked();
		await user.click(
			within(dialog).getByRole("button", { name: "Add employment terms" })
		);

		expect(
			await within(dialog).findByText(
				"Check the normal hours a week: the working days and hours a day must be able to hold them."
			)
		).toBeVisible();
		expect(
			within(dialog).getByText(
				"Check the normal hours a day: they’re outside what terms may set."
			)
		).toBeVisible();
		expect(within(dialog).queryByText("server prose")).toBeNull();
	});

	it("asks how a change applies when the API says the terms are held, then corrects for everyone", async () => {
		const calls = stubApi(
			routes(READ_AND_UPDATE, {
				[`PUT ${TERMS}/${FIVE_DAY_WEEK.id}`]: [
					problemReply(409, "EMPLOYMENT_TERMS_HELD"),
					{ status: 200, body: envelope(FIVE_DAY_WEEK) },
				],
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(await table(panel)).findByRole("button", {
				name: "Edit Five-day week, 44 h",
			})
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Edit employment terms",
		});
		await user.clear(within(dialog).getByLabelText("Normal hours a week"));
		await user.type(within(dialog).getByLabelText("Normal hours a week"), "42");
		await user.click(
			within(dialog).getByRole("button", { name: "Save changes" })
		);

		// Counted as nobody's, but the API says otherwise: the choice, not a dead end.
		const step = await screen.findByRole("dialog", {
			name: "How should this change apply?",
		});
		expect(step).toHaveTextContent(
			"Past and future hours of everyone on these terms are counted again"
		);
		await user.click(within(step).getByRole("button", { name: "Save change" }));

		expect(await screen.findByText("Employment terms saved")).toBeVisible();
		const puts = calls.filter((call) => call.method === "PUT");
		expect(puts.map((call) => call.search)).toEqual([
			"correctForEveryone=false",
			"correctForEveryone=true",
		]);
	});

	it("says how many people to fix first when own hours stand above corrected terms", async () => {
		stubApi(
			routes(READ_AND_UPDATE, {
				[`PUT ${TERMS}/${SIX_DAY_SHIFT.id}`]: {
					status: 409,
					body: {
						status: 409,
						title: "Refused",
						errorCode: "CONTRACTED_HOURS_ABOVE_CORRECTED_TERMS",
						memberCount: 3,
					},
				},
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(await table(panel)).findByRole("button", {
				name: "Edit Six-day shift, 12 h",
			})
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Edit employment terms",
		});
		await user.clear(within(dialog).getByLabelText("Normal hours a week"));
		await user.type(within(dialog).getByLabelText("Normal hours a week"), "40");
		await user.click(
			within(dialog).getByRole("button", { name: "Save changes" })
		);
		const step = await screen.findByRole("dialog", {
			name: "How should this change apply?",
		});
		await user.click(within(step).getByRole("button", { name: "Save change" }));

		expect(
			await within(step).findByText(
				"3 people have their own hours above the new week. Lower their own hours first, or change from a date instead."
			)
		).toBeVisible();
	});

	it("hands the Default mark to the new terms when the Default changes from a date", async () => {
		stubApi(routes(READ_AND_UPDATE));
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(await table(panel)).findByRole("button", {
				name: "Edit Standard week",
			})
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Edit employment terms",
		});
		await user.clear(within(dialog).getByLabelText("Normal hours a week"));
		await user.type(within(dialog).getByLabelText("Normal hours a week"), "42");
		await user.click(
			within(dialog).getByRole("button", { name: "Save changes" })
		);
		const step = await screen.findByRole("dialog", {
			name: "How should this change apply?",
		});
		await user.click(
			within(step).getByRole("radio", { name: /Change from a date/ })
		);

		expect(step).toHaveTextContent(
			/Standard week from .+ also becomes the default for new people\./
		);
	});

	it("says there is nothing to change from a date when the week is the same", async () => {
		const calls = stubApi(routes(READ_AND_UPDATE));
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(await table(panel)).findByRole("button", {
				name: "More actions for Six-day shift, 12 h",
			})
		);
		await user.click(
			await screen.findByRole("menuitem", { name: "Change from a date…" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Edit employment terms",
		});
		await user.click(
			within(dialog).getByRole("button", { name: "More options" })
		);
		await user.type(
			within(dialog).getByLabelText("Description (optional)"),
			"Guards"
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Save changes" })
		);

		expect(
			await within(dialog).findByText(
				/^Nothing changes from a date: the working week is the same\./
			)
		).toBeVisible();
		expect(calls.some((call) => call.method === "PUT")).toBe(false);
	});

	it("saves a new name on held terms without asking", async () => {
		const calls = stubApi(
			routes(READ_AND_UPDATE, {
				[`PUT ${TERMS}/${SIX_DAY_SHIFT.id}`]: {
					status: 200,
					body: envelope(SIX_DAY_SHIFT),
				},
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(await table(panel)).findByRole("button", {
				name: "Edit Six-day shift, 12 h",
			})
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Edit employment terms",
		});
		await user.click(
			within(dialog).getByRole("button", { name: "More options" })
		);
		await user.type(
			within(dialog).getByLabelText("Description (optional)"),
			"Guards"
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Save changes" })
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).toBeNull();
		});
		expect(
			calls.find((call) => call.method === "PUT")?.body
		).not.toHaveProperty("apply");
	});

	it("opens the terms a link names", async () => {
		stubApi(routes(READ_AND_UPDATE));
		await open(`/settings?section=employment&terms=${FIVE_DAY_WEEK.id}`);

		const dialog = await screen.findByRole("dialog", {
			name: "Edit employment terms",
		});
		expect(within(dialog).getByLabelText("Name")).toHaveValue(
			"Five-day week, 44 h"
		);
	});

	it("opens existing terms on their kind, and the seeded default as its own week", async () => {
		stubApi(routes(READ_AND_UPDATE));
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(await table(panel)).findByRole("button", {
				name: "Edit Six-day shift, 12 h",
			})
		);
		let dialog = await screen.findByRole("dialog", {
			name: "Edit employment terms",
		});
		expect(
			await within(dialog).findByRole("radio", { name: /Shift work/ })
		).toBeChecked();
		expect(dialog).toHaveTextContent(
			"Shift work: overtime counts by the week, after 44 hours."
		);
		await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

		await user.click(
			await within(await table(panel)).findByRole("button", {
				name: "Edit Standard week",
			})
		);
		dialog = await screen.findByRole("dialog", {
			name: "Edit employment terms",
		});
		expect(
			await within(dialog).findByRole("radio", { name: /Your own week/ })
		).toBeChecked();
		expect(dialog).toHaveTextContent(
			"Works 44 hours over 6 days a week. The roster picks one rest day each week. Overtime starts after 44 hours in a week."
		);
	});

	it("opens More options by itself when the Act's hour limits are off", async () => {
		stubApi(
			routes(READ_AND_UPDATE, {
				[`GET ${TERMS}/overview`]: {
					status: 200,
					body: envelope(
						overviewResponse([{ ...FIVE_DAY_WEEK, hoursLimitsApply: false }])
					),
				},
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(await table(panel)).findByRole("button", {
				name: "Edit Five-day week, 44 h",
			})
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Edit employment terms",
		});
		expect(
			within(dialog).getByRole("button", { name: "More options" })
		).toHaveAttribute("aria-expanded", "true");
		expect(
			within(dialog).getByRole("radio", { name: /Don’t apply/ })
		).toBeChecked();
	});

	it("says who moves before making terms the default", async () => {
		const calls = stubApi(
			routes(READ_AND_UPDATE, {
				[`PUT ${TERMS}/${FIVE_DAY_WEEK.id}/default`]: {
					status: 200,
					body: envelope({ ...FIVE_DAY_WEEK, isDefault: true }),
				},
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(await table(panel)).findByRole("button", {
				name: "More actions for Five-day week, 44 h",
			})
		);
		await user.click(
			await screen.findByRole("menuitem", { name: "Make default" })
		);
		const confirm = await screen.findByRole("dialog", {
			name: "Make Five-day week, 44 h the default?",
		});
		expect(confirm).toHaveTextContent(
			"New people get Five-day week, 44 h unless you choose other terms when you add them. Nobody’s current terms change."
		);
		await user.click(
			within(confirm).getByRole("button", { name: "Make default" })
		);

		expect(
			await screen.findByText("Five-day week, 44 h is now the default")
		).toBeVisible();
		expect(
			calls.some(
				(call) =>
					call.method === "PUT" &&
					call.path.endsWith(`${FIVE_DAY_WEEK.id}/default`)
			)
		).toBe(true);
	});
});
