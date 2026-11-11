import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
import {
	envelope,
	problemReply,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import { storyCompany } from "@/features/people/storyCompany";
import { readinessFixture } from "@/features/scheduling/readiness/fixtures";
import {
	returnLinkOf,
	type ReturnLink,
} from "@/features/scheduling/readiness/readinessCopy";
import { constraintFixture } from "@/features/scheduling/constraints/fixtures";
import { scheduleFixture } from "@/features/scheduling/schedules/fixtures";
import { SCHEDULING_UNIT_RULES } from "@/features/scheduling/schedules/schedulesUnitRules";
import {
	SHIFT_FIXTURES,
	SHIFT_ROLE_OPTIONS,
	departmentShiftFixture,
} from "@/features/scheduling/shifts/fixtures";
import { ShiftsTab } from "@/features/scheduling/shifts/ShiftsTab";
import type { Workspace } from "@/features/workspace/api";
import { SHIFT_READ_KEYS } from "@/features/workspace/permissionKeys";
import type { UnitSelection } from "@/features/workspace/unitSearch";
import { resolveWorkspaceUnits } from "@/features/workspace/unitSelection";

type Branches = Workspace["companies"][number]["branches"];

const COMPANY = "/api/v1/companies/c-1";
const COMPANY_SHIFTS = `GET ${COMPANY}/shifts`;
const KITCHEN = `${COMPANY}/branches/b-1/departments/d-1`;
const BAR = `${COMPANY}/branches/b-1/departments/d-2`;

/** Orchard (b-1) with Kitchen (d-1) and Bar (d-2); Tampines (b-2) with Front (d-3). Keys at a unit as `held` names them. */
const branches = (held: Record<string, Array<string>> = {}): Branches => {
	const department = (
		uuid: string,
		name: string
	): Branches[number]["departments"][number] => ({
		uuid,
		name,
		status: "ACTIVE",
		permissions: held[uuid] ?? [],
	});
	return [
		{
			uuid: "b-1",
			name: "Orchard",
			status: "ACTIVE",
			country: "SG",
			permissions: [],
			departments: [department("d-1", "Kitchen"), department("d-2", "Bar")],
		},
		{
			uuid: "b-2",
			name: "Tampines",
			status: "ACTIVE",
			country: "SG",
			permissions: [],
			departments: [department("d-3", "Front")],
		},
	];
};

/** Front Desk AM in Kitchen and Breakfast Prep in Bar, both at Orchard. */
const kitchenShift = {
	...departmentShiftFixture(SHIFT_FIXTURES[0]),
	departmentId: "d-1",
	departmentName: "Kitchen",
	branchId: "b-1",
	branchName: "Orchard",
};
const barShift = {
	...departmentShiftFixture(SHIFT_FIXTURES[1]),
	departmentId: "d-2",
	departmentName: "Bar",
	branchId: "b-1",
	branchName: "Orchard",
};

const ok = (body: unknown): StubReply => ({
	status: 200,
	body: envelope(body),
});
const schedulesReply = (...includedShiftIds: Array<Array<string>>): StubReply =>
	ok({
		content: includedShiftIds.map((ids, index) =>
			scheduleFixture({ scheduleId: `s-${index}`, includedShiftIds: ids })
		),
		page: { hasNext: false },
	});

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
	// The router scrolls to the top on load, which jsdom does not implement.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

/**
 * Renders the tab in company c-1 for the `requested` units, holding
 * `permissions` company-wide and `held` per unit.
 */
const show = ({
	permissions = [],
	held = {},
	requested = {},
	onDepartmentChange = vi.fn(),
	returnTo,
}: {
	permissions?: Array<string>;
	held?: Record<string, Array<string>>;
	requested?: UnitSelection;
	onDepartmentChange?: (department: string | undefined) => void;
	returnTo?: ReturnLink;
}): void => {
	const units = resolveWorkspaceUnits(
		effectiveWorkspace({
			companies: [
				{ uuid: "c-1", name: "c-1", permissions, branches: branches(held) },
			],
		}),
		"c-1",
		SHIFT_READ_KEYS,
		requested,
		SCHEDULING_UNIT_RULES
	);
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const Story = (): ReactElement => (
		<ShiftsTab
			companyId="c-1"
			returnTo={returnTo}
			units={units}
			onDepartmentChange={onDepartmentChange}
		/>
	);
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				{storyCompany(
					client,
					"c-1",
					branches(held)
				)(Story, {
					parameters: { permissions },
				} as never)}
			</QueryClientProvider>
		</I18nextProvider>
	);
};

const headers = (): Array<string> =>
	screen.getAllByRole("columnheader").map((header) => header.textContent ?? "");

describe("ShiftsTab", () => {
	it("given_everyDepartment_when_listed_then_namesEachRowsDepartment", async () => {
		stubApi({ [COMPANY_SHIFTS]: ok([kitchenShift, barShift]) });
		show({ permissions: ["shift:read"] });

		const bar = await screen.findByRole("row", { name: /Breakfast Prep/ });
		expect(headers()).toContain("Department");
		expect(bar).toHaveTextContent("Bar");
		expect(
			screen.getByText(
				"The times each department works. New schedules use them; generated schedules keep the shifts they were made with."
			)
		).toBeVisible();
	});

	it("given_oneDepartment_when_listed_then_leavesTheDepartmentColumnOut", async () => {
		const calls = stubApi({ [`GET ${KITCHEN}/shifts`]: ok([kitchenShift]) });
		show({
			permissions: ["shift:read"],
			requested: { branchId: "b-1", departmentId: "d-1" },
		});

		await screen.findByRole("row", { name: /Front Desk AM/ });
		expect(headers()).not.toContain("Department");
		expect(screen.getByText(/^The times Kitchen works\./)).toBeVisible();
		expect(calls.map((call) => call.path)).toEqual([`${KITCHEN}/shifts`]);
	});

	it("given_aDepartmentFilter_when_adding_then_theDialogStartsInIt", async () => {
		const user = userEvent.setup();
		stubApi({
			[`GET ${BAR}/shifts`]: ok([barShift]),
			[`GET ${BAR}/shift-role-options`]: ok(SHIFT_ROLE_OPTIONS),
		});
		show({
			permissions: ["shift:read", "shift:create"],
			requested: { branchId: "b-1", departmentId: "d-2" },
		});

		await user.click(
			await screen.findByRole("button", { name: "Add shift" })
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Add shift",
		});
		expect(
			within(dialog).getByRole("button", { name: /^Department/ })
		).toHaveTextContent("Orchard › Bar");
	});

	it("given_noCreateKey_when_listed_then_offersNoAdd", async () => {
		stubApi({ [COMPANY_SHIFTS]: ok([kitchenShift]) });
		show({ permissions: ["shift:read"] });

		await screen.findByRole("row", { name: /Front Desk AM/ });
		expect(
			screen.queryByRole("button", { name: "Add shift" })
		).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Edit Front Desk AM" })
		).toBeNull();
	});

	it.each<[string, Array<string>, boolean, boolean]>([
		["only the delete key", ["shift:read", "shift:delete"], false, true],
		["only the update key", ["shift:read", "shift:update"], true, false],
	])(
		"given_%s_when_listed_then_offersOnlyItsButton",
		async (_case, permissions, edits, deletes) => {
			stubApi({ [`GET ${KITCHEN}/shifts`]: ok([kitchenShift]) });
			show({
				permissions,
				requested: { branchId: "b-1", departmentId: "d-1" },
			});

			const row = await screen.findByRole("row", { name: /Front Desk AM/ });
			expect(
				within(row).queryByRole("button", { name: "Edit Front Desk AM" }) !==
					null
			).toBe(edits);
			expect(
				within(row).queryByRole("button", {
					name: "Delete Front Desk AM",
				}) !== null
			).toBe(deletes);
		}
	);

	it("given_schedulesReadable_when_editing_then_theNoteCountsTheDrafts", async () => {
		const user = userEvent.setup();
		stubApi({
			[`GET ${KITCHEN}/shifts`]: ok([kitchenShift]),
			[`GET ${KITCHEN}/shift-role-options`]: ok(SHIFT_ROLE_OPTIONS),
			[`GET ${COMPANY}/schedules`]: schedulesReply([kitchenShift.shiftId]),
		});
		show({
			permissions: ["shift:read", "shift:update", "schedule:read"],
			requested: { branchId: "b-1", departmentId: "d-1" },
		});

		await user.click(
			await screen.findByRole("button", { name: "Edit Front Desk AM" })
		);

		expect(
			await screen.findByText(
				"Saving changes this shift for Kitchen: new schedules and 1 draft that uses it. Generated and published schedules keep their own copy."
			)
		).toBeVisible();
		expect(screen.getByRole("button", { name: /^Department/ })).toBeDisabled();
	});

	it("given_schedulesNotReadable_when_editing_then_theNoteSaysAnyDrafts", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			[`GET ${KITCHEN}/shifts`]: ok([kitchenShift]),
			[`GET ${KITCHEN}/shift-role-options`]: ok(SHIFT_ROLE_OPTIONS),
		});
		show({
			permissions: ["shift:read", "shift:update"],
			requested: { branchId: "b-1", departmentId: "d-1" },
		});

		await user.click(
			await screen.findByRole("button", { name: "Edit Front Desk AM" })
		);

		expect(
			await screen.findByText(
				"Saving changes this shift for Kitchen, new schedules and any drafts that use it. Generated and published schedules keep their own copy."
			)
		).toBeVisible();
		expect(calls.some((call) => call.path.endsWith("/schedules"))).toBe(false);
	});

	it("given_draftsAndConstraintsUsingIt_when_deleting_then_theConfirmationNamesBoth", async () => {
		const user = userEvent.setup();
		stubApi({
			[`GET ${KITCHEN}/shifts`]: ok([kitchenShift]),
			[`GET ${COMPANY}/schedules`]: schedulesReply(
				[kitchenShift.shiftId],
				[kitchenShift.shiftId]
			),
			[`GET ${KITCHEN}/constraints`]: ok([
				constraintFixture({
					constraintId: "kitchen-cover",
					name: "Kitchen cover",
					type: "SHIFT_STAFFING",
					values: [
						{
							field: "SHIFT",
							value: kitchenShift.shiftId,
							name: "Front Desk AM",
						},
					],
				}),
			]),
		});
		show({
			permissions: [
				"shift:read",
				"shift:delete",
				"schedule:read",
				"constraint:read",
			],
			requested: { branchId: "b-1", departmentId: "d-1" },
		});

		await user.click(
			await screen.findByRole("button", { name: "Delete Front Desk AM" })
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Delete Front Desk AM?",
		});
		await waitFor(() => {
			expect(dialog).toHaveTextContent(
				"It's removed from Kitchen and from 2 drafts that use it. Generated and published schedules keep their copy. 1 constraint names this shift; it will stop applying to it."
			);
		});
		expect(
			within(dialog).getByRole("button", { name: "Delete shift" })
		).toBeEnabled();
	});

	it("given_aRefusedDelete_when_confirmed_then_keepsTheDialogOpenAndSaysWhy", async () => {
		const user = userEvent.setup();
		stubApi({
			[`GET ${KITCHEN}/shifts`]: ok([kitchenShift]),
			[`DELETE ${KITCHEN}/shifts/${kitchenShift.shiftId}`]: problemReply(
				404,
				"SHIFT_NOT_FOUND"
			),
		});
		show({
			permissions: ["shift:read", "shift:delete"],
			requested: { branchId: "b-1", departmentId: "d-1" },
		});

		await user.click(
			await screen.findByRole("button", { name: "Delete Front Desk AM" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Delete Front Desk AM?",
		});
		await user.click(
			within(dialog).getByRole("button", { name: "Delete shift" })
		);

		expect(
			await within(dialog).findByText("This shift no longer exists.")
		).toBeVisible();
		expect(dialog).toBeVisible();
	});

	it.each<[string, Array<string>, StubReply, string]>([
		[
			"no read key",
			["schedule:read"],
			ok([]),
			"You don’t have permission to see this department’s shifts.",
		],
		[
			"a failed read",
			["shift:read"],
			problemReply(400, "BAD_REQUEST"),
			"We couldn’t load shifts. Try again.",
		],
		[
			"no shifts",
			["shift:read"],
			ok([]),
			"No shifts yet. Shifts are the times people work, such as Opening 07:00–15:00.",
		],
	])(
		"given_%s_when_listed_then_saysSo",
		async (_case, permissions, reply, text) => {
			stubApi({ [COMPANY_SHIFTS]: reply });
			show({ permissions });

			expect(await screen.findByText(text)).toBeVisible();
		}
	);

	it("given_aSearchMatchingNothing_when_typed_then_saysNoShiftsMatch", async () => {
		const user = userEvent.setup();
		stubApi({ [COMPANY_SHIFTS]: ok([kitchenShift, barShift]) });
		show({ permissions: ["shift:read"] });
		await screen.findByRole("row", { name: /Front Desk AM/ });

		await user.type(
			screen.getByRole("searchbox", { name: "Search shifts" }),
			"Night"
		);

		expect(screen.getByText("No shifts match your search.")).toBeVisible();
	});

	it("shows only the departments where shift:read is held, and offers Add only where shift:create is held", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			// What the API answers: rows only from the departments where shift:read is held.
			[COMPANY_SHIFTS]: ok([kitchenShift, barShift]),
			[`GET ${KITCHEN}/shift-role-options`]: ok(SHIFT_ROLE_OPTIONS),
		});
		show({
			held: {
				"d-1": ["shift:read", "shift:create"],
				"d-2": ["shift:read"],
			},
		});

		expect(
			await screen.findByRole("row", { name: /Front Desk AM/ })
		).toHaveTextContent("Kitchen");
		expect(
			screen.getByRole("row", { name: /Breakfast Prep/ })
		).toHaveTextContent("Bar");

		await user.click(screen.getByRole("button", { name: "Filters" }));
		await user.click(screen.getByRole("button", { name: /^Department/ }));
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["All departments", "Bar", "Kitchen"]);
		await user.keyboard("{Escape}");
		await user.keyboard("{Escape}");

		await user.click(screen.getByRole("button", { name: "Add shift" }));
		const dialog = await screen.findByRole("dialog", {
			name: "Add shift",
		});
		await user.click(
			within(dialog).getByRole("button", { name: /^Department/ })
		);
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["Orchard › Kitchen"]);

		expect(
			calls.filter(
				(call) => call.path.includes("d-3") || call.search.includes("d-3")
			)
		).toEqual([]);
	});
});

describe("ShiftsTab: readiness", () => {
	const READINESS = `GET ${COMPANY}/scheduling-readiness`;
	const BAR_NOT_READY = readinessFixture({
		departmentId: "d-2",
		departmentName: "Bar",
		ready: false,
		missing: ["STAFFING_CONSTRAINT"],
	});

	it("given_everyDepartment_when_oneIsNotReady_then_namesItAndANameSetsTheFilter", async () => {
		const user = userEvent.setup();
		const onDepartmentChange = vi.fn();
		const calls = stubApi({
			[COMPANY_SHIFTS]: ok([]),
			[READINESS]: ok([readinessFixture(), BAR_NOT_READY]),
		});
		show({
			permissions: ["shift:read", "schedule:create"],
			onDepartmentChange,
		});

		const note = await screen.findByText(
			"1 department isn’t ready to schedule:"
		);
		expect(screen.queryByRole("button", { name: "Kitchen" })).toBeNull();
		await user.click(screen.getByRole("button", { name: "Bar" }));
		expect(onDepartmentChange).toHaveBeenCalledWith("d-2");
		expect(note).toBeVisible();
		expect(
			calls
				.filter((call) => call.path.endsWith("/scheduling-readiness"))
				.map((call) => call.search)
		).toEqual(["branchId=b-1"]);
	});

	it("given_oneDepartmentNotReady_when_listed_then_showsItsChecklist", async () => {
		stubApi({
			[`GET ${KITCHEN}/shifts`]: ok([]),
			[READINESS]: ok([
				readinessFixture({
					ready: false,
					missing: ["SHIFT", "STAFFING_CONSTRAINT"],
				}),
			]),
		});
		show({
			permissions: ["shift:read", "schedule:create"],
			requested: { branchId: "b-1", departmentId: "d-1" },
		});

		const note = (
			await screen.findByText("Kitchen isn’t ready to schedule yet")
		).closest("[role='note']");
		expect(note).not.toBeNull();
		expect(within(note as HTMLElement).getAllByRole("listitem")).toHaveLength(
			2
		);
	});

	it("given_theWizardWaitingAndAReadyDepartment_when_listed_then_offersToCreateTheSchedule", async () => {
		stubApi({
			[`GET ${KITCHEN}/shifts`]: ok([]),
			[READINESS]: ok([readinessFixture()]),
		});
		show({
			permissions: ["shift:read", "schedule:create"],
			requested: { branchId: "b-1", departmentId: "d-1" },
			returnTo: returnLinkOf({
				next: "create",
				department: "d-1",
				week: "2026-11-16",
			}),
		});

		expect(
			await screen.findByText("Kitchen is ready to schedule.")
		).toBeVisible();
		expect(
			screen.getByRole("link", { name: "Create schedule" })
		).toHaveAttribute("href", "/scheduling/new?department=d-1&week=2026-11-16");
	});

	it("given_noScheduleCreateKey_when_listed_then_showsNoCalloutAndAsksNothing", async () => {
		const calls = stubApi({ [COMPANY_SHIFTS]: ok([]) });
		show({ permissions: ["shift:read"] });

		await screen.findByText(
			"No shifts yet. Shifts are the times people work, such as Opening 07:00–15:00."
		);
		expect(screen.queryByRole("note")).toBeNull();
		expect(
			calls.filter((call) => call.path.endsWith("/scheduling-readiness"))
		).toEqual([]);
	});
});
