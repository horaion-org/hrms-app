import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { storyCompany } from "@/features/people/storyCompany";
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

/** Renders the tab in company c-1 holding schedule:read, its list seeded with `schedules`. */
const show = (
	onDepartmentChange = vi.fn()
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
					parameters: { permissions: ["schedule:read"] },
				} as never)}
			</QueryClientProvider>
		</I18nextProvider>
	);
	return { onDepartmentChange };
};

describe("SchedulesTab", () => {
	it("given_schedulesInTheList_when_rendered_then_showsACardAndAHistoryRowForEach", async () => {
		show();

		expect(
			await screen.findByRole("region", { name: "Front Office - Week 42" })
		).toBeVisible();
		const history = screen.getByRole("table", { name: "Schedule history" });
		expect(
			within(history).getByRole("row", { name: /Kitchen - Week 41/ })
		).toBeVisible();
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
