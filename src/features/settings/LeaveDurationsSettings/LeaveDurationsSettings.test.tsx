import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetApiClient } from "@/common/api-client";
import {
	companyWideWorkspace,
	effectiveWorkspace,
	TEST_BRANCHES,
} from "@/common/testing/effectiveWorkspace";
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
import type { ManagedLeaveDuration } from "@/features/leaveDurations/api";
import { LEAVE_DURATION_CATALOGUE_FIXTURE } from "@/features/leaveDurations/fixtures";
import type { Workspace } from "@/features/workspace/api";

const DURATIONS = "/api/v1/companies/c-1/leave-durations";
const BOTH_KEYS = ["leave_duration:read", "leave_duration:update"];

/** Every duration editable, as a company admin reads them. */
const COMPANY_ADMIN_ROWS: Array<ManagedLeaveDuration> =
	LEAVE_DURATION_CATALOGUE_FIXTURE.map((duration) => ({
		...duration,
		canEdit: true,
	}));

/** Kitchen's admin: both keys at Kitchen (Orchard) only. */
const kitchenAdminWorkspace = (): Workspace =>
	effectiveWorkspace({
		companies: [
			{
				uuid: "c-1",
				name: "Company c-1",
				permissions: [],
				branches: TEST_BRANCHES.map((branch) => ({
					...branch,
					departments: branch.departments.map((department) =>
						department.name === "Kitchen"
							? { ...department, permissions: BOTH_KEYS }
							: department
					),
				})),
			},
		],
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
	workspace: Workspace,
	durations: Array<ManagedLeaveDuration>,
	extra: Record<string, StubReply | Array<StubReply>> = {}
): Record<string, StubReply | Array<StubReply>> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": { status: 200, body: envelope(workspace) },
	[`GET ${DURATIONS}`]: { status: 200, body: envelope(durations) },
	...extra,
});

const open = async (): Promise<HTMLElement> => {
	app = await openApp("/settings?section=leave");
	renderAuthApp(app);
	const panel = await screen.findByRole("tabpanel", { name: "Leave" });
	await within(panel).findByRole("table", { name: "Leave durations" });
	return panel;
};

const rowsOf = (panel: HTMLElement): Array<HTMLElement> =>
	within(within(panel).getByRole("table", { name: "Leave durations" }))
		.getAllByRole("row")
		.slice(1);

describe("LeaveDurationsSettings", () => {
	it("lists a company admin's durations in order, with actions and the order arrows", async () => {
		stubApi(routes(companyWideWorkspace(BOTH_KEYS), COMPANY_ADMIN_ROWS));
		const panel = await open();

		expect(rowsOf(panel).map((row) => row.textContent)).toEqual([
			expect.stringContaining("Morning"),
			expect.stringContaining("Early prep"),
			expect.stringContaining("Late night"),
		]);
		expect(
			within(panel).getByRole("button", { name: "Add duration" })
		).toBeVisible();
		expect(
			within(panel).getByRole("button", { name: "Move Late night up" })
		).toBeVisible();
		expect(
			within(panel).getByRole("button", { name: "Edit Morning" })
		).toBeEnabled();
	});

	it("shows a read-only reader the list alone, without the leave types card", async () => {
		stubApi(
			routes(
				companyWideWorkspace(["leave_duration:read"]),
				LEAVE_DURATION_CATALOGUE_FIXTURE
			)
		);
		const panel = await open();

		expect(rowsOf(panel)).toHaveLength(3);
		expect(within(panel).queryByRole("button")).toBeNull();
		expect(
			within(panel).queryByRole("heading", { name: "Leave types" })
		).toBeNull();
	});

	it("locks a department admin's rows they don't manage, offers no reorder and only their department to add", async () => {
		const user = userEvent.setup();
		stubApi(routes(kitchenAdminWorkspace(), LEAVE_DURATION_CATALOGUE_FIXTURE));
		const panel = await open();

		const [morning, prep] = rowsOf(panel);
		expect(
			within(morning!).getByRole("img", {
				name: "Covers departments you don’t manage",
			})
		).toBeVisible();
		expect(
			within(prep!).getByRole("button", { name: "Edit Early prep" })
		).toBeVisible();
		expect(within(panel).queryByRole("button", { name: /^Move/ })).toBeNull();

		await user.click(
			within(panel).getByRole("button", { name: "Add duration" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Add leave duration",
		});
		const reach = within(dialog).getByRole("radiogroup", {
			name: /Applies to/,
		});
		expect(within(reach).getAllByRole("radio")).toHaveLength(1);
		expect(
			within(dialog).getByRole("button", { name: "Chosen departments" })
		).toHaveTextContent("Kitchen");
	});

	it("deactivates a duration, sending its times and reach back", async () => {
		const user = userEvent.setup();
		const calls = stubApi(
			routes(companyWideWorkspace(BOTH_KEYS), COMPANY_ADMIN_ROWS, {
				[`PUT ${DURATIONS}/ld-morning`]: {
					status: 200,
					body: envelope({ ...COMPANY_ADMIN_ROWS[0], status: "INACTIVE" }),
				},
			})
		);
		const panel = await open();

		await user.click(
			within(panel).getByRole("button", { name: "More actions for Morning" })
		);
		await user.click(screen.getByRole("menuitem", { name: "Deactivate" }));
		const confirm = await screen.findByRole("dialog", {
			name: "Deactivate Morning?",
		});
		await user.click(
			within(confirm).getByRole("button", { name: "Deactivate" })
		);

		await waitFor(() => {
			expect(calls.find((call) => call.method === "PUT")?.body).toEqual({
				name: "Morning",
				startTime: "09:00",
				endTime: "13:00",
				appliesToBranchIds: [],
				appliesToDepartmentIds: [],
				status: "INACTIVE",
			});
		});
	});

	it("deletes a duration after saying requests keep their times", async () => {
		const user = userEvent.setup();
		const calls = stubApi(
			routes(companyWideWorkspace(BOTH_KEYS), COMPANY_ADMIN_ROWS, {
				[`DELETE ${DURATIONS}/ld-night`]: { status: 204 },
			})
		);
		const panel = await open();

		await user.click(
			within(panel).getByRole("button", {
				name: "More actions for Late night",
			})
		);
		await user.click(screen.getByRole("menuitem", { name: "Delete" }));
		const confirm = await screen.findByRole("dialog", {
			name: "Delete Late night?",
		});
		expect(confirm).toHaveTextContent(
			"Requests that used it keep their times."
		);
		await user.click(within(confirm).getByRole("button", { name: "Delete" }));

		await waitFor(() => {
			expect(
				calls.some(
					(call) =>
						call.method === "DELETE" && call.path === `${DURATIONS}/ld-night`
				)
			).toBe(true);
		});
	});
});
