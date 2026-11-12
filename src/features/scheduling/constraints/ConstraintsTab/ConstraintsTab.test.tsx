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
import { ConstraintsTab } from "@/features/scheduling/constraints/ConstraintsTab";
import {
	COMPANY_CONSTRAINT_FIXTURES,
	CONSTRAINT_FIXTURES,
	CONSTRAINT_OPTIONS_RESPONSE,
	DAYS_LIMIT_FIXTURE,
} from "@/features/scheduling/constraints/fixtures";
import { scheduleFixture } from "@/features/scheduling/schedules/fixtures";
import { SCHEDULING_UNIT_RULES } from "@/features/scheduling/schedules/schedulesUnitRules";
import type { Workspace } from "@/features/workspace/api";
import {
	resolveWorkspaceUnits,
	type UnitSelection,
} from "@/features/workspace/unitSelection";

type Branches = Workspace["companies"][number]["branches"];

const COMPANY = "/api/v1/companies/c-1";
const COMPANY_CONSTRAINTS = `GET ${COMPANY}/constraints`;
const KITCHEN = `${COMPANY}/branches/b-1/departments/d-1`;

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

/** The locked Company rest, then Kitchen's Morning cover and Bar's Closing supervisor, all at Orchard. */
const companyRest = COMPANY_CONSTRAINT_FIXTURES[0]!;
const kitchenCover = {
	...CONSTRAINT_FIXTURES[2]!,
	departmentName: "Kitchen",
	branchName: "Orchard",
};
const barSupervisor = {
	...CONSTRAINT_FIXTURES[0]!,
	departmentId: "d-2",
	departmentName: "Bar",
	branchName: "Orchard",
};

const ok = (body: unknown): StubReply => ({
	status: 200,
	body: envelope(body),
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
		["constraint:read"],
		requested,
		SCHEDULING_UNIT_RULES
	);
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const Story = (): ReactElement => (
		<ConstraintsTab
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

/** Kitchen chosen in the Filters, under Orchard. */
const KITCHEN_ONLY: UnitSelection = {
	branchId: "b-1",
	departmentId: "d-1",
};

const headers = (): Array<string> =>
	screen.getAllByRole("columnheader").map((header) => header.textContent ?? "");

describe("ConstraintsTab", () => {
	it("given_everyDepartment_when_listed_then_showsACompanyRowOnceAsAllDepartmentsWithoutActions", async () => {
		stubApi({
			[COMPANY_CONSTRAINTS]: ok([companyRest, kitchenCover, barSupervisor]),
		});
		show({
			permissions: [
				"constraint:read",
				"constraint:update",
				"constraint:delete",
			],
		});

		const company = await screen.findByRole("row", { name: /Company rest/ });
		expect(screen.getAllByRole("row", { name: /Company rest/ })).toHaveLength(
			1
		);
		expect(headers()).toContain("Department");
		expect(company).toHaveTextContent("All departments");
		expect(within(company).queryByRole("button")).toBeNull();
		expect(
			screen.getByRole("row", { name: /Closing supervisor/ })
		).toHaveTextContent("Bar");
		expect(
			screen.getByText(
				"How each department is staffed and rested. Work policy constraints apply where they reach; locked ones always apply."
			)
		).toBeVisible();
	});

	it("given_oneDepartment_when_makingACompanyConstraintStricter_then_opensTheReplaceDialogThere", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			[`GET ${KITCHEN}/constraints`]: ok([companyRest, kitchenCover]),
			[`GET ${KITCHEN}/constraint-options`]: ok(CONSTRAINT_OPTIONS_RESPONSE),
		});
		show({
			permissions: ["constraint:read", "constraint:create"],
			requested: KITCHEN_ONLY,
		});

		const makeStricter = await screen.findByRole("button", {
			name: "Make Company rest stricter here",
		});
		expect(headers()).not.toContain("Department");
		await user.click(makeStricter);

		const dialog = await screen.findByRole("dialog", {
			name: "Set for this department",
		});
		expect(
			within(dialog).getByRole("button", { name: /^Department/ })
		).toHaveTextContent("Orchard › Kitchen");
		expect(calls.map((call) => call.path)).toContain(`${KITCHEN}/constraints`);
	});

	it("given_oneDepartment_when_listed_then_aRuleForFullTimersSaysSo", async () => {
		stubApi({
			[`GET ${KITCHEN}/constraints`]: ok([companyRest, DAYS_LIMIT_FIXTURE]),
			[`GET ${KITCHEN}/constraint-options`]: ok(CONSTRAINT_OPTIONS_RESPONSE),
		});
		show({ permissions: ["constraint:read"], requested: KITCHEN_ONLY });

		const limit = await screen.findByRole("row", { name: /Days in a row/ });
		await waitFor(() => {
			expect(limit).toHaveTextContent(
				"No full-timer goes more than 6 days in a row without a Day off or Rest day."
			);
		});
	});

	it("given_everyDepartment_when_listed_then_aRuleForFullTimersSaysSoFromTheFirstReadableDepartmentsTypes", async () => {
		const calls = stubApi({
			[COMPANY_CONSTRAINTS]: ok([companyRest, DAYS_LIMIT_FIXTURE]),
			[`GET ${KITCHEN}/constraint-options`]: ok(CONSTRAINT_OPTIONS_RESPONSE),
		});
		show({ held: { "d-1": ["constraint:read"] } });

		const limit = await screen.findByRole("row", { name: /Days in a row/ });
		await waitFor(() => {
			expect(limit).toHaveTextContent(
				"No full-timer goes more than 6 days in a row without a Day off or Rest day."
			);
		});
		expect(calls.map((call) => call.path)).toContain(
			`${KITCHEN}/constraint-options`
		);
	});

	it("given_everyDepartment_when_listed_then_offersNoMakeStricter", async () => {
		stubApi({ [COMPANY_CONSTRAINTS]: ok([companyRest, kitchenCover]) });
		show({ permissions: ["constraint:read", "constraint:create"] });

		await screen.findByRole("row", { name: /Company rest/ });
		expect(screen.queryByRole("button", { name: /stricter here/ })).toBeNull();
	});

	it("given_categoryTabs_when_oneIsChosen_then_narrowsAndCountsTheRows", async () => {
		const user = userEvent.setup();
		stubApi({
			[COMPANY_CONSTRAINTS]: ok([companyRest, kitchenCover, barSupervisor]),
		});
		show({ permissions: ["constraint:read"] });

		const tabs = await screen.findByRole("tablist", {
			name: "Constraint categories",
		});
		expect(
			within(tabs)
				.getAllByRole("tab")
				.map((tab) => tab.textContent)
		).toEqual([
			"All 3",
			"People on shifts 1",
			"On duty throughout 1",
			"Rest and hours 1",
		]);

		await user.click(
			within(tabs).getByRole("tab", { name: /People on shifts/ })
		);
		const table = screen.getByRole("table", { name: "Constraints" });
		expect(within(table).getAllByRole("row")).toHaveLength(2);
		expect(
			within(table).getByRole("row", { name: /Morning cover/ })
		).toBeVisible();
	});

	it("given_aDepartmentFilter_when_adding_then_theDialogStartsInIt", async () => {
		const user = userEvent.setup();
		stubApi({
			[`GET ${KITCHEN}/constraints`]: ok([kitchenCover]),
			[`GET ${KITCHEN}/constraint-options`]: ok(CONSTRAINT_OPTIONS_RESPONSE),
		});
		show({
			permissions: ["constraint:read", "constraint:create"],
			requested: KITCHEN_ONLY,
		});

		await user.click(
			await screen.findByRole("button", { name: "Add constraint" })
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Add constraint",
		});
		expect(
			within(dialog).getByRole("button", { name: /^Department/ })
		).toHaveTextContent("Orchard › Kitchen");
	});

	it("given_theWorkPolicyReadKey_when_listed_then_linksToTheWorkPolicyInSettings", async () => {
		stubApi({ [COMPANY_CONSTRAINTS]: ok([kitchenCover]) });
		show({ permissions: ["constraint:read", "scheduling_policy:read"] });

		const link = await screen.findByRole("link", { name: "Open work policy" });
		expect(link).toHaveAttribute("href", "/settings?section=scheduling");
	});

	it("given_noWorkPolicyReadKey_when_listed_then_offersNoLinkToIt", async () => {
		stubApi({ [COMPANY_CONSTRAINTS]: ok([kitchenCover]) });
		show({ permissions: ["constraint:read"] });

		await screen.findByRole("row", { name: /Morning cover/ });
		expect(screen.queryByRole("link", { name: "Open work policy" })).toBeNull();
	});

	it("given_noCreateKey_when_listed_then_offersNoAdd", async () => {
		stubApi({ [COMPANY_CONSTRAINTS]: ok([kitchenCover]) });
		show({ permissions: ["constraint:read"] });

		await screen.findByRole("row", { name: /Morning cover/ });
		expect(screen.queryByRole("button", { name: "Add constraint" })).toBeNull();
	});

	it.each<[string, Array<string>, boolean, boolean]>([
		[
			"only the delete key",
			["constraint:read", "constraint:delete"],
			false,
			true,
		],
		[
			"only the update key",
			["constraint:read", "constraint:update"],
			true,
			false,
		],
	])(
		"given_%s_when_listed_then_offersOnlyItsButton",
		async (_case, permissions, edits, deletes) => {
			stubApi({ [`GET ${KITCHEN}/constraints`]: ok([kitchenCover]) });
			show({ permissions, requested: KITCHEN_ONLY });

			const row = await screen.findByRole("row", { name: /Morning cover/ });
			expect(
				within(row).queryByRole("button", { name: "Edit Morning cover" }) !==
					null
			).toBe(edits);
			expect(
				within(row).queryByRole("button", { name: "Delete Morning cover" }) !==
					null
			).toBe(deletes);
		}
	);

	it("given_schedulesReadable_when_editing_then_theNoteCountsTheDrafts", async () => {
		const user = userEvent.setup();
		stubApi({
			[`GET ${KITCHEN}/constraints`]: ok([kitchenCover]),
			[`GET ${KITCHEN}/constraint-options`]: ok(CONSTRAINT_OPTIONS_RESPONSE),
			[`GET ${COMPANY}/schedules`]: ok({
				content: [
					scheduleFixture({
						includedConstraintIds: [kitchenCover.constraintId],
					}),
				],
				page: { hasNext: false },
			}),
		});
		show({
			permissions: ["constraint:read", "constraint:update", "schedule:read"],
			requested: KITCHEN_ONLY,
		});

		await user.click(
			await screen.findByRole("button", { name: "Edit Morning cover" })
		);

		expect(
			await screen.findByText(
				"Saving changes this constraint for Kitchen: new schedules and 1 draft that uses it. Generated and published schedules keep their own copy."
			)
		).toBeVisible();
		expect(screen.getByRole("button", { name: /^Department/ })).toBeDisabled();
	});

	it("given_schedulesNotReadable_when_editing_then_theNoteSaysAnyDrafts", async () => {
		const user = userEvent.setup();
		stubApi({
			[`GET ${KITCHEN}/constraints`]: ok([kitchenCover]),
			[`GET ${KITCHEN}/constraint-options`]: ok(CONSTRAINT_OPTIONS_RESPONSE),
		});
		show({
			permissions: ["constraint:read", "constraint:update"],
			requested: KITCHEN_ONLY,
		});

		await user.click(
			await screen.findByRole("button", { name: "Edit Morning cover" })
		);

		expect(
			await screen.findByText(
				"Saving changes this constraint for Kitchen, new schedules and any drafts that use it. Generated and published schedules keep their own copy."
			)
		).toBeVisible();
	});

	it("given_draftsUsingIt_when_deleting_then_theConfirmationNamesThemAndNothingElse", async () => {
		const user = userEvent.setup();
		stubApi({
			[`GET ${KITCHEN}/constraints`]: ok([kitchenCover]),
			[`GET ${COMPANY}/schedules`]: ok({
				content: [
					scheduleFixture({
						includedConstraintIds: [kitchenCover.constraintId],
					}),
				],
				page: { hasNext: false },
			}),
		});
		show({
			permissions: ["constraint:read", "constraint:delete", "schedule:read"],
			requested: KITCHEN_ONLY,
		});

		await user.click(
			await screen.findByRole("button", { name: "Delete Morning cover" })
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Delete Morning cover?",
		});
		await waitFor(() => {
			expect(dialog).toHaveTextContent(
				"It's removed from Kitchen and from 1 draft that uses it. Generated and published schedules keep their copy."
			);
		});
		expect(dialog).not.toHaveTextContent("names this shift");
		expect(
			within(dialog).getByRole("button", { name: "Delete constraint" })
		).toBeEnabled();
	});

	it("given_aRefusedDelete_when_confirmed_then_keepsTheDialogOpenAndSaysWhy", async () => {
		const user = userEvent.setup();
		stubApi({
			[`GET ${KITCHEN}/constraints`]: ok([kitchenCover]),
			[`DELETE ${KITCHEN}/constraints/${kitchenCover.constraintId}`]:
				problemReply(403, "ACCESS_DENIED"),
		});
		show({
			permissions: ["constraint:read", "constraint:delete"],
			requested: KITCHEN_ONLY,
		});

		await user.click(
			await screen.findByRole("button", { name: "Delete Morning cover" })
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Delete Morning cover?",
		});
		await user.click(
			within(dialog).getByRole("button", { name: "Delete constraint" })
		);

		expect(await within(dialog).findByRole("alert")).toBeVisible();
		expect(dialog).toBeVisible();
	});

	it.each<[string, Array<string>, StubReply, string]>([
		[
			"no read key",
			["schedule:read"],
			ok([]),
			"You don’t have permission to see this department’s constraints.",
		],
		[
			"a failed read",
			["constraint:read"],
			problemReply(400, "BAD_REQUEST"),
			"We couldn’t load constraints. Try again.",
		],
		[
			"no constraints",
			["constraint:read"],
			ok([]),
			"No department constraints yet. Start with a staffing constraint: how many people each shift needs.",
		],
	])(
		"given_%s_when_listed_then_saysSo",
		async (_case, permissions, reply, text) => {
			stubApi({ [COMPANY_CONSTRAINTS]: reply });
			show({ permissions });

			expect(await screen.findByText(text)).toBeVisible();
		}
	);

	it("given_aSearchMatchingNothing_when_typed_then_saysNoConstraintsMatch", async () => {
		const user = userEvent.setup();
		stubApi({ [COMPANY_CONSTRAINTS]: ok([companyRest, kitchenCover]) });
		show({ permissions: ["constraint:read"] });
		await screen.findByRole("row", { name: /Morning cover/ });

		await user.type(
			screen.getByRole("searchbox", { name: "Search constraints" }),
			"Overtime"
		);

		expect(screen.getByText("No constraints match your search.")).toBeVisible();
	});

	it("shows only the departments where constraint:read is held, and offers Add only where constraint:create is held", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			// What the API answers: company rows once, then rows only from the departments where constraint:read is held.
			[COMPANY_CONSTRAINTS]: ok([companyRest, kitchenCover, barSupervisor]),
			[`GET ${KITCHEN}/constraint-options`]: ok(CONSTRAINT_OPTIONS_RESPONSE),
		});
		show({
			held: {
				"d-1": ["constraint:read", "constraint:create"],
				"d-2": ["constraint:read"],
			},
		});

		expect(
			await screen.findByRole("row", { name: /Morning cover/ })
		).toHaveTextContent("Kitchen");
		expect(
			screen.getByRole("row", { name: /Closing supervisor/ })
		).toHaveTextContent("Bar");
		expect(screen.getAllByRole("row", { name: /Company rest/ })).toHaveLength(
			1
		);

		await user.click(screen.getByRole("button", { name: "Filters" }));
		await user.click(screen.getByRole("button", { name: /^Department/ }));
		expect(
			screen.getAllByRole("option").map((option) => option.textContent)
		).toEqual(["All departments", "Bar", "Kitchen"]);
		await user.keyboard("{Escape}");
		await user.keyboard("{Escape}");

		await user.click(screen.getByRole("button", { name: "Add constraint" }));
		const dialog = await screen.findByRole("dialog", {
			name: "Add constraint",
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

describe("ConstraintsTab: readiness", () => {
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
			[COMPANY_CONSTRAINTS]: ok([]),
			[READINESS]: ok([readinessFixture(), BAR_NOT_READY]),
		});
		show({
			permissions: ["constraint:read", "schedule:create"],
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
			[`GET ${KITCHEN}/constraints`]: ok([]),
			[READINESS]: ok([
				readinessFixture({
					ready: false,
					missing: ["SHIFT", "STAFFING_CONSTRAINT"],
				}),
			]),
		});
		show({
			permissions: ["constraint:read", "schedule:create"],
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
			[`GET ${KITCHEN}/constraints`]: ok([]),
			[READINESS]: ok([readinessFixture()]),
		});
		show({
			permissions: ["constraint:read", "schedule:create"],
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
		const calls = stubApi({ [COMPANY_CONSTRAINTS]: ok([]) });
		show({ permissions: ["constraint:read"] });

		await screen.findByText(
			"No department constraints yet. Start with a staffing constraint: how many people each shift needs."
		);
		expect(screen.queryByRole("note")).toBeNull();
		expect(
			calls.filter((call) => call.path.endsWith("/scheduling-readiness"))
		).toEqual([]);
	});
});
