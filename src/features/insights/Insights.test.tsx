import { screen, within } from "@testing-library/react";
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
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { endSession } from "@/features/auth/session";
import { renderAuthApp } from "@/features/auth/testing";
import { overtimeFixture } from "@/features/dashboard/fixtures";
import {
	rosterChangeDepartmentFixture,
	staffingRuleFixture,
} from "@/features/insights/fixtures";

const SCHEDULES = "/api/v1/companies/c-1/schedules";

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

const workspaceReply = (permissions: Array<string>): StubReply => ({
	status: 200,
	body: envelope(
		effectiveWorkspace({
			companies: [
				{
					uuid: "c-1",
					name: "Company c-1",
					permissions,
					branches: [
						{
							uuid: "b-1",
							name: "Main branch",
							status: "ACTIVE",
							country: "SG",
							permissions: [],
							departments: [
								{
									uuid: "d-1",
									name: "Sales",
									status: "ACTIVE",
									permissions: [],
								},
							],
						},
					],
				},
			],
		})
	),
});

const routes = (permissions: Array<string>): Record<string, StubReply> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": workspaceReply(permissions),
	[`GET ${SCHEDULES}/staffing`]: {
		status: 200,
		body: envelope({
			from: "2026-11-01",
			to: "2026-11-30",
			rules: [staffingRuleFixture()],
		}),
	},
	[`GET ${SCHEDULES}/overtime`]: {
		status: 200,
		body: envelope(overtimeFixture()),
	},
	[`GET ${SCHEDULES}/roster-changes`]: {
		status: 200,
		body: envelope({
			from: "2026-11-01",
			to: "2026-11-30",
			departments: [rosterChangeDepartmentFixture()],
		}),
	},
});

const open = async (entry: string): Promise<OpenedApp> => {
	app = await openApp(entry);
	renderAuthApp(app);
	return app;
};

describe("Insights", () => {
	it("shows the three tables over the chosen dates", async () => {
		const calls = stubApi(routes(["schedule:read"]));
		await open("/insights?from=2026-10-01&to=2026-11-30");

		expect(
			await screen.findByRole("heading", { level: 1, name: "Insights" })
		).toBeInTheDocument();
		expect(
			await screen.findByRole("table", { name: "Staffing by rule" })
		).toHaveTextContent("Front desk AM");
		expect(
			await screen.findByRole("table", { name: "Overtime by month" })
		).toHaveTextContent("Aisha Rahman");
		expect(
			await screen.findByRole("table", { name: "Changes after publishing" })
		).toHaveTextContent("By hand");
		const asked = (read: string): string | undefined =>
			calls.find((call) => call.path === `${SCHEDULES}/${read}`)?.search;
		expect(asked("staffing")).toContain("from=2026-10-01&to=2026-11-30");
		expect(asked("overtime")).toContain("from=2026-10&to=2026-11");
	});

	it("asks for nothing over a range the API would refuse, and says why", async () => {
		const calls = stubApi(routes(["schedule:read"]));
		await open("/insights?from=2026-01-01&to=2026-12-31");

		expect(
			await screen.findByText("Choose at most 92 days.")
		).toBeInTheDocument();
		expect(calls.some((call) => call.path.startsWith(SCHEDULES))).toBe(false);
	});

	it("is not offered in the menu without the roster read", async () => {
		stubApi(routes(["leave_request:read"]));
		await open("/");

		const navigation = await screen.findByRole("navigation");
		expect(
			within(navigation).queryByRole("link", { name: "Insights" })
		).toBeNull();
	});
});
