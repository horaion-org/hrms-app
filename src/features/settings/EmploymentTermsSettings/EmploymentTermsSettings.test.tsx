import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
	SIX_DAY_SHIFT,
	TERMS_OVERVIEW_RESPONSE,
	TERMS_PRESETS,
} from "@/features/employmentTerms/fixtures";

const TERMS = "/api/v1/companies/c-1/employment-terms";
const READ_AND_UPDATE = ["employment_terms:read", "employment_terms:update"];

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
	return screen.findByRole("tabpanel", { name: "Employment" });
};

const table = (panel: HTMLElement): Promise<HTMLElement> =>
	within(panel).findByRole("table", { name: "Employment terms" });

describe("EmploymentTermsSettings", () => {
	it("lists the terms with their week, people and the Default for new people", async () => {
		stubApi(routes(READ_AND_UPDATE));
		const panel = await open();

		const rows = await table(panel);
		const standard = within(rows).getByRole("row", { name: /Standard week/ });
		expect(standard).toHaveTextContent("6 days · 44 h");
		expect(standard).toHaveTextContent("Rest day on the roster");
		expect(standard).toHaveTextContent("Default");
		expect(
			within(rows).getByRole("row", { name: /Six-day shift/ })
		).toHaveTextContent("41 people+2 from a later date");
		// No one is described as following the Default: everyone has terms.
		expect(panel).not.toHaveTextContent(/of their own|counted under/);
		expect(
			within(panel).getByRole("link", { name: "Scheduling" })
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
		expect(
			within(sixDay).getByRole("link", {
				name: "Show the people on Six-day shift, 12 h",
			})
		).toHaveAttribute("href", `/people?branch=all&terms=${SIX_DAY_SHIFT.id}`);
		expect(within(sixDay).getByRole("link")).toHaveTextContent("41 people");
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

		await screen.findByRole("tab", { name: /Scheduling/ });
		expect(screen.queryByRole("tab", { name: /Employment/ })).toBeNull();
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
		await user.click(
			await within(dialog).findByRole("radio", { name: /Five-day week, 44 h/ })
		);
		expect(dialog).toHaveTextContent(
			"Works 5 days a week, 8.8 hours a day. Rest day Sunday. Overtime starts after 8.8 hours in a day or 44 hours in a week. Employment Act hour limits apply."
		);
		expect(within(dialog).getByLabelText("Name")).toHaveValue(
			"5-day week, 44 h"
		);

		await user.clear(within(dialog).getByLabelText("Normal hours a week"));
		await user.type(within(dialog).getByLabelText("Normal hours a week"), "42");
		expect(dialog).toHaveTextContent(
			"8.8 hours in a day or 42 hours in a week"
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
		});
		expect(await screen.findByText("Employment terms added")).toBeVisible();
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
		await user.type(within(dialog).getByLabelText("Working days a week"), "5");
		await user.type(
			within(dialog).getByLabelText("Normal hours a day"),
			"12.5"
		);
		await user.type(
			within(dialog).getByLabelText("Normal hours a week"),
			"8.33"
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Add employment terms" })
		);

		expect(
			await within(dialog).findByText("Enter 0.5 to 12 hours.")
		).toBeVisible();
		expect(
			within(dialog).getByText(
				"Use hours that make whole minutes, such as 8.5 or 8.75."
			)
		).toBeVisible();
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
		await user.click(
			await within(dialog).findByRole("radio", { name: /Five-day week, 44 h/ })
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Add employment terms" })
		);

		expect(
			await within(dialog).findByText(
				"Check the normal hours a week: 1 to 60 hours, and no more than the working days × the normal day."
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
