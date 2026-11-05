import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
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
	MEMBER_ON_STANDARD,
	MEMBER_TERMS,
	SIX_DAY_SHIFT,
	STANDARD_WEEK,
	TERMS_PRESETS,
	termsListResponse,
} from "@/features/employmentTerms/fixtures";

const COMPANY = "/api/v1/companies/c-1";
const PROFILE = `${COMPANY}/member-profiles/m-1`;
const MEMBER_TERMS_PATH = `${PROFILE}/employment-terms`;

/** `company` held company-wide, `kitchen` at department d-1 only. */
const workspaceReply = (
	company: Array<string>,
	kitchen: Array<string> = []
): StubReply => ({
	status: 200,
	body: envelope(
		effectiveWorkspace({
			companies: [
				{
					uuid: "c-1",
					name: "Company c-1",
					permissions: company,
					branches: [
						{
							uuid: "b-1",
							name: "Orchard",
							status: "ACTIVE",
							country: "SG",
							permissions: [],
							departments: [
								{
									uuid: "d-1",
									name: "Kitchen",
									status: "ACTIVE",
									permissions: kitchen,
								},
							],
						},
					],
				},
			],
		})
	),
});

const kent = {
	membershipId: "m-1",
	employeeCode: "EMP-10392",
	displayName: "Kent Chua",
	email: "kent.chua@company.com",
	phone: null,
	branchId: "b-1",
	branchName: "Orchard",
	departmentId: "d-1",
	departmentName: "Kitchen",
	jobTitleId: null,
	jobTitleName: null,
	status: "ACTIVE",
	dateOfBirth: null,
	employmentType: "FULL_TIME",
	hireDate: "2025-03-01",
	probationEndDate: null,
	endDate: null,
	reportsTo: null,
	invitationPending: false,
};

const CHANGER = workspaceReply(
	["member_profile:read", "employment_terms:read"],
	["member_employment_terms:read", "member_employment_terms:update"]
);

const routes = (
	workspace: StubReply,
	terms: StubReply | Array<StubReply> = {
		status: 200,
		body: envelope(MEMBER_TERMS),
	},
	extra: Record<string, StubReply | Array<StubReply>> = {}
): Record<string, StubReply | Array<StubReply>> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": workspace,
	[`GET ${PROFILE}`]: { status: 200, body: envelope(kent) },
	[`GET ${MEMBER_TERMS_PATH}`]: terms,
	[`GET ${COMPANY}/employment-terms`]: {
		status: 200,
		body: envelope(
			termsListResponse([STANDARD_WEEK, FIVE_DAY_WEEK, SIX_DAY_SHIFT])
		),
	},
	[`GET ${COMPANY}/employment-terms/presets`]: {
		status: 200,
		body: envelope(TERMS_PRESETS),
	},
	...extra,
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

const open = async (entry = "/people/m-1"): Promise<HTMLElement> => {
	app = await openApp(entry);
	renderAuthApp(app);
	return screen.findByRole("region", { name: /Employment information/ });
};

describe("A person's employment terms", () => {
	it("read in plain words, since when, with the change ahead and a link to the terms", async () => {
		stubApi(routes(CHANGER));
		const card = await open();

		const link = await within(card).findByRole("link", {
			name: "View Six-day shift, 12 h in Settings",
		});
		expect(link).toHaveAttribute(
			"href",
			"/settings?section=employment&terms=terms-six-day-shift"
		);
		expect(card).toHaveTextContent(
			"Works 6 days a week in shifts of up to 12 hours."
		);
		expect(card).toHaveTextContent("Since 1 Mar 2025");
		expect(card).toHaveTextContent("From 4 Jan 2027: Five-day week, 44 h");
		expect(within(card).getByRole("button", { name: "Change…" })).toBeVisible();
	});

	it("are read-only without member_employment_terms:update", async () => {
		stubApi(
			routes(
				workspaceReply(
					["member_profile:read"],
					["member_employment_terms:read"]
				)
			)
		);
		const card = await open();

		expect(await within(card).findByText("Six-day shift, 12 h")).toBeVisible();
		expect(within(card).queryByRole("button", { name: "Change…" })).toBeNull();
		expect(within(card).queryByRole("link", { name: /View / })).toBeNull();
	});

	it("are left out, and never asked for, without member_employment_terms:read", async () => {
		const calls = stubApi(routes(workspaceReply(["member_profile:read"])));
		const without = await open();
		await within(without).findByText("Full-time");
		expect(within(without).queryByText("Employment terms")).toBeNull();
		expect(calls.some((call) => call.path === MEMBER_TERMS_PATH)).toBe(false);
	});

	it("name the terms someone was given when terms were introduced, as their own", async () => {
		const user = userEvent.setup();
		stubApi(
			routes(CHANGER, { status: 200, body: envelope(MEMBER_ON_STANDARD) })
		);
		const card = await open();

		expect(
			await within(card).findByRole("link", {
				name: "View Standard week in Settings",
			})
		).toHaveTextContent("Standard week");
		expect(card).toHaveTextContent("Since 3 Jun 2024");
		expect(card).not.toHaveTextContent(/\(default\)|Not set for them/);
		expect(within(card).getByRole("button", { name: "Change…" })).toBeVisible();

		await user.click(within(card).getByRole("button", { name: "History" }));
		const history = await screen.findByRole("dialog", {
			name: "Employment terms history",
		});
		expect(history).toHaveTextContent(
			"Set when employment terms were introduced"
		);
	});

	it("show the next change ahead, not the furthest", async () => {
		const later = {
			...MEMBER_TERMS.history[0]!,
			id: "entry-later",
			effectiveFrom: "2027-03-01",
			termsName: "Part-time, 20 h",
		};
		stubApi(
			routes(CHANGER, {
				status: 200,
				body: envelope({
					...MEMBER_TERMS,
					history: [later, ...MEMBER_TERMS.history],
				}),
			})
		);
		const card = await open();

		expect(
			await within(card).findByText(/From 4 Jan 2027: Five-day week, 44 h/)
		).toBeVisible();
		expect(card).not.toHaveTextContent("Part-time, 20 h");
	});

	it("change from a Monday, with their own hours, and warn of a mismatch", async () => {
		const calls = stubApi(
			routes(CHANGER, undefined, {
				[`POST ${MEMBER_TERMS_PATH}`]: {
					status: 201,
					body: envelope(MEMBER_TERMS),
				},
			})
		);
		const user = userEvent.setup();
		const card = await open();

		await user.click(
			await within(card).findByRole("button", { name: "Change…" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Change employment terms",
		});
		expect(dialog).toHaveTextContent(
			"Changes start on a Monday after their first terms (1 Mar 2025)."
		);
		await user.click(within(dialog).getByRole("button", { name: /^Terms/ }));
		await user.click(
			await screen.findByRole("option", { name: "Five-day week, 44 h" })
		);
		expect(dialog).toHaveTextContent("Works 5 days a week, 8.8 hours a day.");
		await user.type(within(dialog).getByLabelText("Hours a week"), "20");
		expect(dialog).toHaveTextContent(
			"Their employment type is Full-time, but these terms are part-time (20 h a week)."
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Change terms" })
		);

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).toBeNull();
		});
		const body = calls.find(
			(call) => call.method === "POST" && call.path === MEMBER_TERMS_PATH
		)?.body as {
			employmentTermsId: string;
			effectiveFrom: string;
			contractedWeekMinutes: number;
		};
		expect(body.employmentTermsId).toBe(FIVE_DAY_WEEK.id);
		expect(body.contractedWeekMinutes).toBe(1200);
		expect(new Date(`${body.effectiveFrom}T00:00:00`).getDay()).toBe(1);
		expect(
			await screen.findByText(/^Employment terms changed from /)
		).toBeVisible();
	});

	it("explain a refusal on the field it is about", async () => {
		stubApi(
			routes(CHANGER, undefined, {
				[`POST ${MEMBER_TERMS_PATH}`]: problemReply(
					409,
					"EMPLOYMENT_TERMS_CHANGE_EXISTS"
				),
			})
		);
		const user = userEvent.setup();
		const card = await open();

		await user.click(
			await within(card).findByRole("button", { name: "Change…" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Change employment terms",
		});
		await user.click(
			within(dialog).getByRole("button", { name: "Change terms" })
		);

		expect(
			await within(dialog).findByText(
				"They already have a change on this date. Correct that entry instead."
			)
		).toBeVisible();
	});

	it("list their history, cancel a change ahead, and correct an entry", async () => {
		const calls = stubApi(
			routes(CHANGER, undefined, {
				[`DELETE ${MEMBER_TERMS_PATH}/entry-upcoming`]: { status: 204 },
				[`PUT ${MEMBER_TERMS_PATH}/entry-first`]: {
					status: 200,
					body: envelope(MEMBER_TERMS),
				},
			})
		);
		const user = userEvent.setup();
		const card = await open();

		await user.click(
			await within(card).findByRole("button", { name: "History" })
		);
		const history = await screen.findByRole("dialog", {
			name: "Employment terms history",
		});
		const rows = within(history).getAllByRole("row");
		expect(rows[1]).toHaveTextContent("4 Jan 2027Scheduled");
		expect(rows[1]).toHaveTextContent("Lee Mei · 5 Nov 2026");
		expect(rows[2]).toHaveTextContent("Imported · 4 Nov 2026");

		await user.click(
			within(history).getByRole("button", {
				name: "Cancel the change from 4 Jan 2027",
			})
		);
		const confirm = await screen.findByRole("dialog", {
			name: "Cancel the change to Five-day week, 44 h from 4 Jan 2027?",
		});
		await user.click(
			within(confirm).getByRole("button", { name: "Cancel change" })
		);
		expect(await screen.findByText("Change cancelled.")).toBeVisible();
		expect(
			calls.some(
				(call) =>
					call.method === "DELETE" && call.path.endsWith("/entry-upcoming")
			)
		).toBe(true);

		const reopened = await screen.findByRole("dialog", {
			name: "Employment terms history",
		});
		await user.click(
			within(reopened).getByRole("button", {
				name: "Correct the entry from 1 Mar 2025",
			})
		);
		const correct = await screen.findByRole("dialog", {
			name: "Correct employment terms",
		});
		// The first entry may move to any day while it stays first; a hire date edit doesn't move it.
		expect(correct).toHaveTextContent(
			"Their first terms start on the day they joined. You can move that day as long as it stays before any later change; editing their hire date doesn’t move it."
		);
		await user.click(
			within(correct).getByRole("button", { name: "Save correction" })
		);
		expect(await screen.findByText("Entry corrected.")).toBeVisible();
		expect(
			calls.find(
				(call) => call.method === "PUT" && call.path.endsWith("/entry-first")
			)?.body
		).toMatchObject({
			employmentTermsId: SIX_DAY_SHIFT.id,
			effectiveFrom: "2025-03-01",
		});
	});
});

describe("Correcting an entry on terms deactivated since", () => {
	it("keeps them chosen, marked inactive", async () => {
		stubApi(
			routes(CHANGER, {
				status: 200,
				body: envelope({
					...MEMBER_TERMS,
					history: [
						{
							...MEMBER_TERMS.history[0]!,
							termsId: "terms-retired",
							termsName: "Night guards",
						},
						MEMBER_TERMS.history[1],
					],
				}),
			})
		);
		const user = userEvent.setup();
		const card = await open();

		await user.click(
			await within(card).findByRole("button", { name: "History" })
		);
		const history = await screen.findByRole("dialog", {
			name: "Employment terms history",
		});
		await user.click(
			within(history).getByRole("button", {
				name: "Correct the entry from 4 Jan 2027",
			})
		);
		const correct = await screen.findByRole("dialog", {
			name: "Correct employment terms",
		});
		expect(
			within(correct).getByRole("button", { name: /^Terms/ })
		).toHaveTextContent("Night guards (inactive)");
	});
});

describe("My employment terms", () => {
	it("stay quiet on My profile when they can't be read yet", async () => {
		stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/me/workspace": workspaceReply([]),
			[`GET ${COMPANY}/me/profile`]: {
				status: 200,
				body: envelope({ ...kent, membershipId: "m-c-1" }),
			},
		});
		const card = await open("/me/profile");

		expect(
			await within(card).findByText(
				"Your employment terms aren’t available yet."
			)
		).not.toHaveClass("text-error-700");
	});

	it("show read-only on My profile, with nothing granted", async () => {
		stubApi({
			"POST /api/v1/public/sessions/refreshes": accessPassReply(),
			"GET /api/v1/me": currentUserReply(),
			"GET /api/v1/me/workspace": workspaceReply([]),
			[`GET ${COMPANY}/me/profile`]: {
				status: 200,
				body: envelope({ ...kent, membershipId: "m-c-1" }),
			},
			[`GET ${COMPANY}/me/employment-terms`]: {
				status: 200,
				body: envelope({
					inForce: MEMBER_TERMS.inForce,
					reference: MEMBER_TERMS.reference,
				}),
			},
		});
		const card = await open("/me/profile");

		expect(await within(card).findByText("Six-day shift, 12 h")).toBeVisible();
		expect(card).toHaveTextContent("Since 1 Mar 2025");
		expect(within(card).queryByRole("button")).toBeNull();
		expect(within(card).queryByRole("link")).toBeNull();
	});
});
