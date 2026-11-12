import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { storyCompany } from "@/features/people/storyCompany";
import { approvalKeys } from "@/features/approvals/api";
import { approvalInstanceFixture } from "@/features/approvals/fixtures";
import { scheduleMonthSummariesKey } from "@/features/scheduling/months/api";
import { monthSummaryFixture } from "@/features/scheduling/months/fixtures";
import { summaryRange } from "@/features/scheduling/months/monthWeeks";
import { SchedulesTab } from "@/features/scheduling/SchedulesTab";
import { schedulesInUnitsKey } from "@/features/scheduling/schedules/api";
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
	permissions = ["schedule:read"]
): { onDepartmentChange: typeof onDepartmentChange } => {
	// The router scrolls to the top on load, which jsdom does not implement.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, staleTime: Infinity } },
	});
	client.setQueryData(schedulesInUnitsKey("c-1", selectedUnits(UNITS)), [
		scheduleFixture({ name: "Front Office - Week 42" }),
		generatedScheduleFixture({ scheduleId: "s-2", name: "Kitchen - Week 41" }),
	]);
	client.setQueryData(
		scheduleMonthSummariesKey(
			"c-1",
			selectedUnits(UNITS),
			summaryRange(new Date())
		),
		SUMMARIES
	);
	client.setQueryData(approvalKeys.pending("c-1"), [
		approvalInstanceFixture({ subjectId: "s-2" }),
	]);
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
	it("given_monthSummaries_when_rendered_then_aSectionPerMonthEarliestFirstWithACardPerDepartment", async () => {
		show();

		const sections = await screen.findAllByRole("region", {
			name: /^(November|December) 2026$/,
		});
		expect(
			sections.map((section) => section.getAttribute("aria-labelledby"))
		).toEqual(["month-2026-11", "month-2026-12"]);
		expect(
			within(sections[0]!).getByRole("region", { name: "Kitchen" })
		).toBeVisible();
		expect(
			within(sections[1]!).getByRole("region", { name: "Front Office" })
		).toBeVisible();
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

	it("given_anApprovalWaitingOnTheViewer_when_rendered_then_itsMonthCardSaysWhichWeek", async () => {
		show(vi.fn(), ["schedule:read", "approval:decide"]);

		const kitchen = await screen.findByRole("region", { name: "Kitchen" });
		expect(kitchen).toHaveTextContent(
			/waiting on you · step 1 of 2 \(Endorse\)/
		);
	});

	it("given_aSearch_when_typed_then_narrowsTheMonthCardsByDepartment", async () => {
		const user = userEvent.setup();
		show();
		await screen.findByRole("region", { name: "Kitchen" });

		await user.type(screen.getByRole("searchbox"), "Kitchen");

		expect(screen.getByRole("region", { name: "Kitchen" })).toBeVisible();
		expect(screen.queryByRole("region", { name: "Front Office" })).toBeNull();
		expect(screen.queryByRole("heading", { name: "December 2026" })).toBeNull();
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
