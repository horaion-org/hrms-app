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
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	LEAVE_TYPE_CATALOGUE_FIXTURE,
	managedLeaveTypeFixture,
} from "@/features/leaveTypes/fixtures";
import {
	initialLeaveTypeValues,
	leaveTypeBodyOf,
	leaveTypeSchema,
} from "@/features/leaveTypes/LeaveTypeDialog/schema";

// Under load (Maven build alongside, shared CI runner) this file timed out at the 5 s default.
vi.setConfig({ testTimeout: 15_000 });

const LEAVE_TYPES = "/api/v1/companies/c-1/leave-types";

const routes = (
	extra: Record<string, StubReply> = {}
): Record<string, StubReply> => ({
	"POST /api/v1/public/sessions/refreshes": accessPassReply(),
	"GET /api/v1/me": currentUserReply(),
	"GET /api/v1/me/workspace": {
		status: 200,
		body: envelope(
			companyWideWorkspace(["leave_type:read", "leave_type:update"])
		),
	},
	[`GET ${LEAVE_TYPES}`]: {
		status: 200,
		body: envelope(LEAVE_TYPE_CATALOGUE_FIXTURE),
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

const openPanel = async (): Promise<HTMLElement> => {
	app = await openApp("/settings?section=leave");
	renderAuthApp(app);
	return screen.findByRole("tabpanel", { name: "Leave" });
};

const openAdd = async (): Promise<HTMLElement> => {
	const panel = await openPanel();
	await userEvent.click(
		await within(panel).findByRole("button", { name: "Add leave type" })
	);
	return screen.findByRole("dialog", { name: "Add leave type" });
};

describe("LeaveTypeDialog", () => {
	it("adds a per-occasion type that asks for a reason", async () => {
		const calls = stubApi(
			routes({
				[`POST ${LEAVE_TYPES}`]: {
					status: 201,
					body: envelope(managedLeaveTypeFixture()),
				},
			})
		);
		const user = userEvent.setup();
		const dialog = await openAdd();

		await user.type(within(dialog).getByLabelText("Name"), "Study leave");
		await user.click(
			within(dialog).getByRole("radio", { name: /Per occasion/ })
		);
		await user.click(
			within(dialog).getByRole("checkbox", { name: /Ask for a reason/ })
		);
		await user.click(
			within(dialog).getByRole("button", { name: "Add leave type" })
		);

		await waitFor(() => {
			expect(
				calls.find(
					(call) => call.method === "POST" && call.path === LEAVE_TYPES
				)?.body
			).toEqual({
				name: "Study leave",
				grantKind: "PER_OCCASION",
				paid: true,
				requiresReason: true,
				allowsPartDays: true,
				appliesToBranchIds: [],
				appliesToDepartmentIds: [],
			});
		});
		expect(await screen.findByText("Leave type added")).toBeVisible();
	});

	it("shows a taken name on the name field", async () => {
		stubApi(
			routes({
				[`POST ${LEAVE_TYPES}`]: problemReply(409, "LEAVE_TYPE_NAME_CONFLICT"),
			})
		);
		const user = userEvent.setup();
		const dialog = await openAdd();

		await user.type(within(dialog).getByLabelText("Name"), "Sick leave");
		await user.click(
			within(dialog).getByRole("button", { name: "Add leave type" })
		);

		expect(
			await within(dialog).findByText(
				"A leave type named “Sick leave” already exists."
			)
		).toBeVisible();
	});

	it.each([
		[
			problemReply(409, "LEAVE_TYPE_KIND_LOCKED"),
			"Requests use this leave type, so how it is counted can’t change.",
		],
		[
			problemReply(404, "LEAVE_TYPE_NOT_FOUND"),
			"This leave type is no longer available. Close and reload the page.",
		],
	])("says why an edit is refused (%#)", async (reply, message) => {
		stubApi(routes({ [`PUT ${LEAVE_TYPES}/lt-marriage`]: reply }));
		const user = userEvent.setup();
		const panel = await openPanel();

		await user.click(
			await within(panel).findByRole("button", { name: "Edit Marriage leave" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Edit leave type",
		});
		await user.click(
			within(dialog).getByRole("radio", { name: /No allowance/ })
		);
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		expect(await within(dialog).findByText(message)).toBeVisible();
	});

	it("fixes how a used type is counted and keeps its status when saving", async () => {
		const calls = stubApi(
			routes({
				[`PUT ${LEAVE_TYPES}/lt-annual`]: {
					status: 200,
					body: envelope(managedLeaveTypeFixture({ name: "Holiday" })),
				},
			})
		);
		const user = userEvent.setup();
		const panel = await openPanel();

		await user.click(
			await within(panel).findByRole("button", { name: "Edit Annual leave" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Edit leave type",
		});
		for (const radio of within(dialog).getAllByRole("radio")) {
			expect(radio).toBeDisabled();
		}
		expect(dialog).toHaveTextContent(
			"Used by 12 requests, so how it is counted can’t change."
		);
		const name = within(dialog).getByLabelText("Name");
		await user.clear(name);
		await user.type(name, "Holiday");
		await user.click(within(dialog).getByRole("button", { name: "Save" }));

		await waitFor(() => {
			expect(
				calls.find(
					(call) =>
						call.method === "PUT" && call.path === `${LEAVE_TYPES}/lt-annual`
				)?.body
			).toEqual({
				name: "Holiday",
				grantKind: "ALLOWANCE",
				paid: true,
				requiresReason: false,
				allowsPartDays: true,
				appliesToBranchIds: [],
				appliesToDepartmentIds: [],
				status: "ACTIVE",
			});
		});
	});
});

describe("leave type form rules", () => {
	const schema = leaveTypeSchema(authTestI18n.t);

	it("starts a new type as a paid yearly allowance and an edit from the type", () => {
		expect(initialLeaveTypeValues(undefined)).toEqual({
			name: "",
			grantKind: "ALLOWANCE",
			paid: true,
			requiresReason: false,
			allowsPartDays: true,
			reach: { appliesTo: "COMPANY", branchIds: [], departmentIds: [] },
		});
		expect(
			initialLeaveTypeValues({
				...managedLeaveTypeFixture({ paid: false, requiresReason: true }),
				grantKind: "UNTRACKED",
			})
		).toEqual({
			name: "Annual leave",
			grantKind: "UNTRACKED",
			paid: false,
			requiresReason: true,
			allowsPartDays: true,
			reach: { appliesTo: "COMPANY", branchIds: [], departmentIds: [] },
		});
	});

	it("refuses a name the API would refuse and sends a valid one as typed", () => {
		expect(
			schema.safeParse({
				name: "Study <leave>",
				grantKind: "ALLOWANCE",
				paid: true,
				requiresReason: false,
				allowsPartDays: true,
				reach: { appliesTo: "COMPANY", branchIds: [], departmentIds: [] },
			}).success
		).toBe(false);
		const values = schema.parse({
			name: "Study leave",
			grantKind: "UNTRACKED",
			paid: false,
			requiresReason: true,
			allowsPartDays: false,
			reach: {
				appliesTo: "DEPARTMENTS",
				branchIds: ["b-orchard"],
				departmentIds: ["d-kitchen"],
			},
		});
		expect(leaveTypeBodyOf(values)).toEqual({
			name: "Study leave",
			grantKind: "UNTRACKED",
			paid: false,
			requiresReason: true,
			allowsPartDays: false,
			appliesToBranchIds: [],
			appliesToDepartmentIds: ["d-kitchen"],
		});
	});
});
