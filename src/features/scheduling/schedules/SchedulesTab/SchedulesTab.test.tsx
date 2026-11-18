import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { storyCompany } from "@/features/people/storyCompany";
import {
	scheduleMonthSummariesKey,
	type ScheduleMonthSummary,
} from "@/features/scheduling/months/api";
import { monthSummaryFixture } from "@/features/scheduling/months/fixtures";
import { summaryRange } from "@/features/scheduling/months/monthWeeks";
import { SchedulesTab } from "@/features/scheduling/schedules/SchedulesTab";
import {
	schedulesInUnitsKey,
	type Schedule,
} from "@/features/scheduling/schedules/api";
import {
	generatedScheduleFixture,
	SCHEDULING_BRANCHES,
	scheduleFixture,
	schedulingWorkspace,
} from "@/features/scheduling/schedules/fixtures";
import { SCHEDULING_UNIT_RULES } from "@/features/scheduling/schedules/schedulesUnitRules";
import { SCHEDULE_READ_KEYS } from "@/features/workspace/permissionKeys";
import {
	resolveWorkspaceUnits,
	selectedUnits,
} from "@/features/workspace/unitSelection";

const UNITS = resolveWorkspaceUnits(
	schedulingWorkspace(["schedule:read"]),
	"c-1",
	SCHEDULE_READ_KEYS,
	{},
	SCHEDULING_UNIT_RULES
);

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

/** Kitchen's November and Front Office's December, as the API answers them. */
const SUMMARIES = [
	monthSummaryFixture({
		month: "2026-12",
		departmentId: "d-1",
		departmentName: "Front Office",
		weeks: [
			{ periodStart: "2026-12-07", state: "PUBLISHED", scheduleId: "s-7" },
		],
	}),
	monthSummaryFixture({ departmentId: "d-2", departmentName: "Kitchen" }),
];

/** Renders the tab in company c-1, its schedules and month summaries seeded; `permissions` as given. */
const show = (
	onDepartmentChange = vi.fn(),
	permissions = ["schedule:read"],
	kitchenStatus: Schedule["status"] = "GENERATION_REQUESTED",
	/** Still loading when null. */
	summaries: Array<ScheduleMonthSummary> | null = SUMMARIES,
	kitchen: Partial<Schedule> = {}
): { onDepartmentChange: typeof onDepartmentChange } => {
	// The router scrolls to the top on load, which jsdom does not implement.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, staleTime: Infinity } },
	});
	client.setQueryData(schedulesInUnitsKey("c-1", selectedUnits(UNITS)), [
		scheduleFixture({ name: "Front Office - Week 42" }),
		generatedScheduleFixture({
			scheduleId: "s-2",
			name: "Kitchen - Week 41",
			status: kitchenStatus,
			...kitchen,
		}),
	]);
	const monthsKey = scheduleMonthSummariesKey(
		"c-1",
		selectedUnits(UNITS),
		summaryRange(new Date())
	);
	if (summaries) client.setQueryData(monthsKey, summaries);
	// A read that never answers keeps the months loading.
	else
		void client.prefetchQuery({
			queryKey: monthsKey,
			queryFn: () => new Promise<Array<ScheduleMonthSummary>>(() => {}),
		});
	const Story = (): ReactElement => (
		<SchedulesTab
			companyId="c-1"
			units={UNITS}
			onDepartmentChange={onDepartmentChange}
		/>
	);
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				{storyCompany(
					client,
					"c-1",
					SCHEDULING_BRANCHES
				)(Story, {
					parameters: { permissions },
				} as never)}
			</QueryClientProvider>
		</I18nextProvider>
	);
	return { onDepartmentChange };
};

describe("SchedulesTab", () => {
	it("given_departmentsInReach_when_rendered_then_aDepartmentsSectionWithACardPerDepartmentAndNoMonth", async () => {
		show();

		const departments = await screen.findByRole("region", {
			name: "Departments",
		});
		const kitchen = within(departments).getByRole("region", {
			name: "Kitchen",
		});
		expect(
			within(kitchen).getByRole("link", { name: "Open the Kitchen roster" })
		).toHaveAttribute("href", "/scheduling/department?department=d-2");
		expect(
			within(departments).getAllByRole("region", { name: "Front Office" })
		).not.toHaveLength(0);
		expect(screen.queryByRole("region", { name: /2026$/ })).toBeNull();
	});

	it("given_theSchedules_when_rendered_then_theHistoryStillListsEveryOne", async () => {
		show();

		const history = await screen.findByRole("table", {
			name: "Schedule history",
		});
		expect(
			within(history).getByRole("row", { name: /Front Office - Week 42/ })
		).toBeVisible();
		expect(
			within(history).getByRole("row", { name: /Kitchen - Week 41/ })
		).toBeVisible();
	});

	it("given_aGeneratedSchedule_when_listed_then_itsHistoryStatusReadsToReview", async () => {
		show(vi.fn(), ["schedule:read"], "GENERATED");

		const history = await screen.findByRole("table", {
			name: "Schedule history",
		});
		const row = within(history).getByRole("row", { name: /Kitchen - Week 41/ });
		expect(within(row).getAllByText("To review")[0]).toBeInTheDocument();
		expect(within(row).queryByText("Generated")).toBeNull();
	});

	it("given_aSchedule_when_listed_then_itsRowStartsWithItsWeekAndTheViewButtonNamesDepartmentAndWeek", async () => {
		show();

		const history = await screen.findByRole("table", {
			name: "Schedule history",
		});
		const row = within(history).getByRole("row", {
			name: /Front Office - Week 42/,
		});
		expect(within(row).getAllByRole("cell")[0]).toHaveTextContent(
			/^Oct 12\s?–\s?18, 2026/
		);
		expect(
			within(row).getByRole("link", {
				name: /^View the Front Office schedule for Oct 12\s?–\s?18, 2026$/,
			})
		).toBeInTheDocument();
	});

	it("given_aPart_when_listed_then_itsDateIsTheDaysItCovers", async () => {
		show(vi.fn(), ["schedule:read"], "GENERATED", SUMMARIES, {
			coveredFrom: "2026-10-15",
		});

		const history = await screen.findByRole("table", {
			name: "Schedule history",
		});
		const row = within(history).getByRole("row", { name: /Kitchen - Week 41/ });
		expect(within(row).getAllByRole("cell")[0]).toHaveTextContent(
			/^Oct 15\s?–\s?18, 2026Part of the week of Oct 12\s?–\s?18, 2026·/
		);
	});

	it("given_aPartTheViewerMayDelete_when_listed_then_itsMenuIsNamedByItsDays", async () => {
		show(
			vi.fn(),
			["schedule:read", "schedule:delete"],
			"GENERATED",
			SUMMARIES,
			{
				coveredFrom: "2026-10-15",
			}
		);

		const history = await screen.findByRole("table", {
			name: "Schedule history",
		});
		const row = within(history).getByRole("row", { name: /Kitchen - Week 41/ });
		expect(
			within(row).getByRole("button", {
				name: /^More actions for Oct 15\s?–\s?18, 2026$/,
			})
		).toBeInTheDocument();
	});

	it("given_aWholeWeekSchedule_when_listed_then_saysNoPartAndItsMenuKeepsItsName", async () => {
		show(vi.fn(), ["schedule:read", "schedule:delete"], "GENERATED");

		const history = await screen.findByRole("table", {
			name: "Schedule history",
		});
		const row = within(history).getByRole("row", { name: /Kitchen - Week 41/ });
		expect(within(row).getAllByRole("cell")[0]).toHaveTextContent(
			/^Oct 12\s?–\s?18, 2026·Name/
		);
		expect(
			within(row).getByRole("button", {
				name: "More actions for Kitchen - Week 41",
			})
		).toBeInTheDocument();
	});

	it("given_daysToReview_when_rendered_then_theDepartmentCardCountsThemAndSaysWhichWait", async () => {
		show();

		const kitchen = await screen.findByRole("region", { name: "Kitchen" });
		expect(kitchen).toHaveTextContent("14 days to review");
		expect(kitchen).toHaveTextContent(
			/Nov 16\s?–\s?29, 2026 are waiting for you to publish\./
		);
	});

	it("given_aSearch_when_typed_then_narrowsTheDepartmentCards", async () => {
		const user = userEvent.setup();
		show();
		await screen.findByRole("region", { name: "Kitchen" });

		await user.type(screen.getByRole("searchbox"), "Kitchen");

		expect(screen.getByRole("region", { name: "Kitchen" })).toBeVisible();
		expect(screen.queryByRole("region", { name: "Front Office" })).toBeNull();
		expect(screen.queryByRole("heading", { name: "December 2026" })).toBeNull();
	});

	it("given_theMonthsStillLoading_when_rendered_then_saysTheDepartmentsAreLoading", async () => {
		show(vi.fn(), ["schedule:read"], "GENERATION_REQUESTED", null);

		expect(await screen.findByText("Loading the departments…")).toHaveAttribute(
			"role",
			"status"
		);
	});

	it("given_noSchedule_when_rendered_then_eachDepartmentStillHasACardSayingSo", async () => {
		show(vi.fn(), ["schedule:read"], "GENERATION_REQUESTED", []);

		const kitchen = await screen.findByRole("region", { name: "Kitchen" });
		expect(kitchen).toHaveTextContent("No roster yet");
		expect(kitchen).toHaveTextContent("Nothing published yet");
	});

	it("given_aSearchThatMatchesNoDepartment_when_typed_then_saysTheSearchEmptiedTheList", async () => {
		const user = userEvent.setup();
		show();
		await screen.findByRole("region", { name: "Departments" });

		await user.type(screen.getByRole("searchbox"), "Nowhere");

		expect(
			await screen.findByText(
				"No department matches your search or filters. Clear them to see every department."
			)
		).toBeInTheDocument();
	});

	it("given_aSearch_when_typed_then_narrowsTheHistory", async () => {
		const user = userEvent.setup();
		show();
		await screen.findByRole("table", { name: "Schedule history" });

		await user.type(screen.getByRole("searchbox"), "Kitchen");

		const history = screen.getByRole("table", { name: "Schedule history" });
		expect(
			within(history).queryByRole("row", { name: /Front Office - Week 42/ })
		).toBeNull();
		expect(
			within(history).getByRole("row", { name: /Kitchen - Week 41/ })
		).toBeVisible();
	});
});
