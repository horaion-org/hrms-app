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
	BRANCH_POLICY_FIXTURE,
	COMPANY_CONSTRAINT_FIXTURES,
	CONSTRAINT_OPTIONS_RESPONSE,
	DEPARTMENTS_POLICY_FIXTURE,
} from "@/features/scheduling/constraints/fixtures";

const REFRESH = "POST /api/v1/public/sessions/refreshes";
const ME = "GET /api/v1/me";
const WORKSPACE = "GET /api/v1/me/workspace";
const POLICY = "/api/v1/companies/c-1/scheduling-policy";
const READ_AND_UPDATE = ["scheduling_policy:read", "scheduling_policy:update"];

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
	[REFRESH]: accessPassReply(),
	[ME]: currentUserReply(),
	[WORKSPACE]: {
		status: 200,
		body: envelope(companyWideWorkspace(permissions)),
	},
	[`GET ${POLICY}/constraints`]: {
		status: 200,
		body: envelope(COMPANY_CONSTRAINT_FIXTURES),
	},
	[`GET ${POLICY}/constraint-options`]: {
		status: 200,
		body: envelope(CONSTRAINT_OPTIONS_RESPONSE),
	},
	...extra,
});

const open = async (): Promise<HTMLElement> => {
	app = await openApp("/settings?section=scheduling");
	renderAuthApp(app);
	return screen.findByRole("tabpanel", { name: "Work policy" });
};

describe("SchedulingPolicySettings", () => {
	it("lists the company's constraints as sentences with their locks", async () => {
		stubApi(routes(READ_AND_UPDATE));
		const panel = await open();

		const table = await within(panel).findByRole("table", {
			name: "Work policy constraints",
		});
		const rest = within(table).getByRole("row", { name: /Company rest/ });
		expect(rest).toHaveTextContent(
			"Must Everyone gets at least 11 hours off between shifts.Whole company"
		);
		expect(rest).toHaveTextContent("Locked");
		expect(
			within(table)
				.getAllByRole("columnheader")
				.map((header) => header.textContent)
		).not.toContain("Constraint type");
		expect(
			within(table).getByRole("row", { name: /Company weekends/ })
		).toHaveTextContent("Default");
		expect(
			within(panel).getByRole("button", { name: "Add constraint" })
		).toBeVisible();
	});

	it("says where each constraint applies", async () => {
		stubApi(
			routes(READ_AND_UPDATE, {
				[`GET ${POLICY}/constraints`]: {
					status: 200,
					body: envelope([
						...COMPANY_CONSTRAINT_FIXTURES,
						DEPARTMENTS_POLICY_FIXTURE,
						BRANCH_POLICY_FIXTURE,
					]),
				},
			})
		);
		const panel = await open();

		const table = await within(panel).findByRole("table", {
			name: "Work policy constraints",
		});
		expect(
			within(table).getByRole("row", { name: /Company rest/ })
		).toHaveTextContent("Whole company");
		expect(
			within(table).getByRole("row", { name: /Kitchen and Bar rest/ })
		).toHaveTextContent("Bar, Kitchen");
		expect(
			within(table).getByRole("row", { name: /Orchard weekends/ })
		).toHaveTextContent("Orchard (branch)");
	});

	it("adds a constraint for chosen departments", async () => {
		const calls = stubApi(
			routes(READ_AND_UPDATE, {
				[`POST ${POLICY}/constraints`]: {
					status: 201,
					body: envelope(DEPARTMENTS_POLICY_FIXTURE),
				},
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(panel).findByRole("button", { name: "Add constraint" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Add constraint",
		});
		const name = within(dialog).getByRole("textbox", { name: /^Name/ });
		await user.clear(name);
		await user.type(name, "Rest");
		await user.click(
			within(dialog).getByRole("button", { name: /^What it controls/ })
		);
		await user.click(
			await screen.findByRole("option", { name: "Rest between shifts" })
		);
		await user.click(
			within(dialog).getByRole("radio", { name: "Chosen departments" })
		);
		await user.click(
			within(dialog).getByRole("button", { name: /^Chosen departments/ })
		);
		await user.click(await screen.findByRole("option", { name: "Front" }));
		await user.keyboard("{Escape}");
		await user.type(
			within(dialog).getByRole("spinbutton", { name: /^Hours off/ }),
			"11"
		);
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(
				calls.find(
					(call) =>
						call.method === "POST" && call.path === `${POLICY}/constraints`
				)?.body
			).toMatchObject({
				appliesToBranchIds: [],
				appliesToDepartmentIds: ["d-3"],
			});
		});
	});

	it("offers no changes without scheduling_policy:update", async () => {
		stubApi(routes(["scheduling_policy:read"]));
		const panel = await open();

		await within(panel).findByRole("table", {
			name: "Work policy constraints",
		});
		expect(
			within(panel).queryByRole("button", { name: "Add constraint" })
		).toBeNull();
		expect(
			within(panel).queryByRole("button", { name: /^(Edit|Delete) / })
		).toBeNull();
	});

	it("adds a constraint with the lock chosen", async () => {
		const calls = stubApi(
			routes(READ_AND_UPDATE, {
				[`POST ${POLICY}/constraints`]: {
					status: 201,
					body: envelope(COMPANY_CONSTRAINT_FIXTURES[0]),
				},
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(panel).findByRole("button", { name: "Add constraint" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Add constraint",
		});
		const name = within(dialog).getByRole("textbox", { name: /^Name/ });
		await user.clear(name);
		await user.type(name, "Rest");
		await user.click(
			within(dialog).getByRole("button", { name: /^What it controls/ })
		);
		await user.click(
			await screen.findByRole("option", {
				name: "Rest between shifts",
			})
		);
		await user.type(
			within(dialog).getByRole("spinbutton", { name: /^Hours off/ }),
			"11"
		);
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(
				calls.find(
					(call) =>
						call.method === "POST" && call.path === `${POLICY}/constraints`
				)?.body
			).toMatchObject({
				name: "Rest",
				type: "REST_BETWEEN_SHIFTS",
				lock: "LOCKED",
				values: [{ field: "REST_HOURS", value: "11" }],
				appliesToBranchIds: [],
				appliesToDepartmentIds: [],
			});
		});
	});

	it("saves an edit with its lock", async () => {
		const calls = stubApi(
			routes(READ_AND_UPDATE, {
				[`PUT ${POLICY}/constraints/company-rest`]: {
					status: 200,
					body: envelope(COMPANY_CONSTRAINT_FIXTURES[0]),
				},
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(panel).findByRole("button", { name: "Edit Company rest" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Edit constraint",
		});
		const rest = within(dialog).getByRole("spinbutton", { name: /^Hours off/ });
		await user.clear(rest);
		await user.type(rest, "12");
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(
				calls.find(
					(call) =>
						call.method === "PUT" &&
						call.path === `${POLICY}/constraints/company-rest`
				)?.body
			).toMatchObject({
				name: "Company rest",
				type: "REST_BETWEEN_SHIFTS",
				lock: "LOCKED",
				values: [{ field: "REST_HOURS", value: "12" }],
			});
		});
		expect(
			await screen.findByText("Work policy constraint saved")
		).toBeVisible();
	});

	it("words a second constraint of one type as the company's", async () => {
		stubApi(
			routes(READ_AND_UPDATE, {
				[`POST ${POLICY}/constraints`]: problemReply(
					409,
					"CONSTRAINT_TYPE_ALREADY_USED"
				),
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(panel).findByRole("button", { name: "Add constraint" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Add constraint",
		});
		const name = within(dialog).getByRole("textbox", { name: /^Name/ });
		await user.clear(name);
		await user.type(name, "Rest");
		await user.click(
			within(dialog).getByRole("button", { name: /^What it controls/ })
		);
		await user.click(
			await screen.findByRole("option", {
				name: "Rest between shifts",
			})
		);
		await user.type(
			within(dialog).getByRole("spinbutton", { name: /^Hours off/ }),
			"12"
		);
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		expect(
			await within(dialog).findByText(
				"The company already has a constraint of this type. Edit that one instead."
			)
		).toBeVisible();
	});

	it("says the policy is not the person's to see when the API refuses it", async () => {
		stubApi(
			routes(["scheduling_policy:read"], {
				[`GET ${POLICY}/constraints`]: problemReply(
					403,
					"AUTHORIZATION_DENIED"
				),
			})
		);
		const panel = await open();

		expect(
			await within(panel).findByText(
				"You don’t have permission to see the work policy."
			)
		).toBeVisible();
		expect(within(panel).queryByRole("alert")).toBeNull();
	});

	it("alerts when the policy fails to load (a refusal that is not retried)", async () => {
		stubApi(
			routes(["scheduling_policy:read"], {
				[`GET ${POLICY}/constraints`]: problemReply(404, "COMPANY_NOT_FOUND"),
			})
		);
		const panel = await open();

		expect(await within(panel).findByRole("alert")).toHaveTextContent(
			"We couldn’t load the work policy. Try again."
		);
	});

	it("opens from a link without scheduling_policy:read, to say so", async () => {
		const calls = stubApi(routes([]));
		const panel = await open();

		expect(panel).toHaveTextContent(
			"You don’t have permission to see the work policy."
		);
		expect(calls.some((call) => call.path === `${POLICY}/constraints`)).toBe(
			false
		);
	});

	it("removes a constraint once confirmed", async () => {
		const calls = stubApi(
			routes(READ_AND_UPDATE, {
				[`DELETE ${POLICY}/constraints/company-rest`]: { status: 204 },
			})
		);
		const user = userEvent.setup();
		const panel = await open();

		await user.click(
			await within(panel).findByRole("button", { name: "Delete Company rest" })
		);
		const confirm = await screen.findByRole("dialog", {
			name: "Remove Company rest?",
		});
		await user.click(within(confirm).getByRole("button", { name: "Remove" }));

		await waitFor(() => {
			expect(
				calls.some(
					(call) =>
						call.method === "DELETE" &&
						call.path === `${POLICY}/constraints/company-rest`
				)
			).toBe(true);
		});
	});
});
