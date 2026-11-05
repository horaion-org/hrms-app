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
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import {
	COMPANY_CONSTRAINT_FIXTURES,
	CONSTRAINT_OPTIONS_RESPONSE,
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
	return screen.findByRole("tabpanel", { name: "Scheduling" });
};

describe("SchedulingPolicySettings", () => {
	it("lists the company's constraints as sentences with their locks", async () => {
		stubApi(routes(READ_AND_UPDATE));
		const panel = await open();

		const table = await within(panel).findByRole("table", {
			name: "Scheduling policy constraints",
		});
		const rest = within(table).getByRole("row", { name: /Company rest/ });
		expect(rest).toHaveTextContent(
			"Hours of rest between one shift and the next must be at least 11."
		);
		expect(rest).toHaveTextContent("Locked");
		expect(
			within(table).getByRole("row", { name: /Company weekends/ })
		).toHaveTextContent("Default");
		expect(
			within(panel).getByRole("button", { name: "Add constraint" })
		).toBeVisible();
	});

	it("offers no changes without scheduling_policy:update", async () => {
		stubApi(routes(["scheduling_policy:read"]));
		const panel = await open();

		await within(panel).findByRole("table", {
			name: "Scheduling policy constraints",
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
		await user.type(within(dialog).getByLabelText("Constraint name"), "Rest");
		await user.click(
			within(dialog).getByRole("button", { name: /^Constraint type/ })
		);
		await user.click(
			await screen.findByRole("option", {
				name: "Working hours: Rest between shifts",
			})
		);
		await user.type(
			within(dialog).getByRole("spinbutton", { name: /Rest/ }),
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
			});
		});
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
