import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { WeekState } from "@/features/scheduling/months/api";
import {
	type TickableWeek,
	tickableWeeksOf,
} from "@/features/scheduling/months/weekTicks";
import {
	MonthSetupStep,
	type MonthSetupStepProps,
} from "@/features/scheduling/MonthSetupStep";
import { schedulingWorkspace } from "@/features/scheduling/schedules/fixtures";
import { workspaceQuery } from "@/features/workspace/api";

const DEFAULTS = {
	departmentId: "",
	month: "2026-11",
	includeLeave: true,
};

/** Tuesday 17 November 2026: the week of 16 Nov has started. */
const TODAY = "2026-11-17";
const NOVEMBER_MONDAYS = [
	"2026-11-02",
	"2026-11-09",
	"2026-11-16",
	"2026-11-23",
	"2026-11-30",
];

/** November's weeks with the given states by Monday, the others not generated, as Setup lists them today. */
const novemberWeeks = (
	states: Record<string, WeekState> = {}
): Array<TickableWeek> =>
	tickableWeeksOf(
		NOVEMBER_MONDAYS.map((periodStart) => ({
			periodStart,
			state: states[periodStart] ?? "NOT_GENERATED",
		})),
		TODAY
	);

/** The `weeks` prop: November's weeks with `ticked` ticked. */
const weeksProp = (
	rows: Array<TickableWeek>,
	ticked: Array<string>,
	onTickedChange = vi.fn()
): MonthSetupStepProps["weeks"] => ({ rows, ticked, onTickedChange });

const clientWithWorkspace = (): QueryClient => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, staleTime: Infinity } },
	});
	client.setQueryData(
		workspaceQuery.queryKey,
		schedulingWorkspace(["schedule:read", "schedule:create"])
	);
	return client;
};

const Harness = (props: Partial<MonthSetupStepProps>): FunctionComponent => (
	<I18nextProvider i18n={authTestI18n}>
		<QueryClientProvider client={clientWithWorkspace()}>
			<MonthSetupStep
				companyId="c-1"
				defaultValues={DEFAULTS}
				formId="month-setup"
				months={["2026-11", "2026-12", "2027-01"]}
				onDepartmentChange={vi.fn()}
				onMonthChange={vi.fn()}
				onSubmit={vi.fn()}
				{...props}
			/>
			<button form="month-setup" type="submit">
				Next
			</button>
		</QueryClientProvider>
	</I18nextProvider>
);

// Dates read as the test browser (en-US) writes them.
describe("MonthSetupStep", () => {
	it("given_novemberWeeks_when_shown_then_oneRowPerWeekWithItsDatesAndState", () => {
		const rows = novemberWeeks({
			"2026-11-02": "PUBLISHED",
			"2026-11-09": "PUBLISHED",
			"2026-11-23": "TO_REVIEW",
		});
		render(<Harness weeks={weeksProp(rows, ["2026-11-30"])} />);

		const table = screen.getByRole("table", { name: "Weeks" });
		expect(within(table).getAllByRole("row")).toHaveLength(
			NOVEMBER_MONDAYS.length + 1
		);
		const expected = [
			["Mon, Nov 2 to Sun, Nov 8", "Published"],
			["Mon, Nov 9 to Sun, Nov 15", "Published"],
			["Mon, Nov 16 to Sun, Nov 22", "Started"],
			["Mon, Nov 23 to Sun, Nov 29", "To review"],
			["Mon, Nov 30 to Sun, Dec 6", "Not generated"],
		] as const;
		for (const [dates, state] of expected) {
			const row = within(table).getByRole("row", { name: new RegExp(dates) });
			expect(within(row).getByText(state)).toBeInTheDocument();
		}
		expect(
			screen.getByText("A week belongs to the month its Monday falls in.")
		).toBeInTheDocument();
	});

	it("given_publishedOverAndGeneratingWeeks_when_shown_then_theirBoxesAreDisabled", () => {
		const rows = novemberWeeks({
			"2026-11-09": "PUBLISHED",
			"2026-11-16": "GENERATING",
		});
		render(<Harness weeks={weeksProp(rows, ["2026-11-23"])} />);

		for (const dates of [
			"Mon, Nov 2 to Sun, Nov 8",
			"Mon, Nov 9 to Sun, Nov 15",
			"Mon, Nov 16 to Sun, Nov 22",
		]) {
			expect(
				screen.getByRole("checkbox", { name: `Select ${dates}` })
			).toBeDisabled();
		}
		expect(
			screen.getByRole("checkbox", {
				name: "Select Mon, Nov 23 to Sun, Nov 29",
			})
		).toBeEnabled();
	});

	it("given_aRowTicked_when_clicked_then_toldTheNewTicks", async () => {
		const user = userEvent.setup();
		const onTickedChange = vi.fn();
		render(
			<Harness
				weeks={weeksProp(novemberWeeks(), ["2026-11-30"], onTickedChange)}
			/>
		);

		await user.click(
			screen.getByRole("checkbox", {
				name: "Select Mon, Nov 23 to Sun, Nov 29",
			})
		);

		expect(onTickedChange).toHaveBeenCalledOnce();
		const ticked = onTickedChange.mock.calls[0]?.[0] as Array<string>;
		expect([...ticked].sort()).toEqual(["2026-11-23", "2026-11-30"]);
	});

	it("given_touchingTickedWeeks_when_shown_then_oneRangeInTheSummary", () => {
		render(
			<Harness
				weeks={weeksProp(novemberWeeks(), ["2026-11-23", "2026-11-30"])}
			/>
		);

		expect(
			screen.getByText("2 weeks: Mon, Nov 23 to Sun, Dec 6")
		).toBeInTheDocument();
	});

	it("given_aTickedStartedWeek_when_shown_then_warnsItIsGeneratedWhole", () => {
		render(<Harness weeks={weeksProp(novemberWeeks(), ["2026-11-16"])} />);

		expect(
			screen.getByText(
				"Mon, Nov 16 to Sun, Nov 22 has already started. It is generated whole, Monday included."
			)
		).toBeInTheDocument();
	});

	it("given_aTickedWeekUnderReview_when_shown_then_warnsItsRosterIsReplaced", () => {
		const rows = novemberWeeks({ "2026-11-23": "TO_REVIEW" });
		render(<Harness weeks={weeksProp(rows, ["2026-11-23"])} />);

		expect(
			screen.getByText(
				"Mon, Nov 23 to Sun, Nov 29 has a roster waiting for review. Generating again replaces it."
			)
		).toBeInTheDocument();
	});

	it("given_aSkippedWeekBetweenTickedWeeks_when_shown_then_warnsItsHoursAreNotCounted", () => {
		render(
			<Harness
				weeks={weeksProp(novemberWeeks(), ["2026-11-30", "2026-11-16"])}
			/>
		);

		expect(
			screen.getByText(
				"Mon, Nov 23 to Sun, Nov 29 is left out and has no roster. Hours worked that week don’t count towards this month’s overtime unless a roster covers it."
			)
		).toBeInTheDocument();
	});

	it("given_nothingTicked_when_shown_then_saysTickAtLeastOneWeek", () => {
		render(<Harness weeks={weeksProp(novemberWeeks(), [])} />);

		expect(
			screen.getByText("Tick at least one week to schedule.")
		).toBeInTheDocument();
	});

	it("given_noWeekCanBeTicked_when_shown_then_saysChooseAnotherMonth", () => {
		const rows = novemberWeeks(
			Object.fromEntries(
				NOVEMBER_MONDAYS.map((monday) => [monday, "PUBLISHED" as const])
			)
		);
		render(<Harness weeks={weeksProp(rows, [])} />);

		expect(
			screen.getByText(
				"No week of November 2026 can be scheduled: each is published, over or being generated. Choose another month."
			)
		).toBeInTheDocument();
	});

	it("given_aSuggestedMonth_when_theMonthWasNotTouched_then_itIsChosen", async () => {
		const onMonthChange = vi.fn();
		render(<Harness suggestedMonth="2026-12" onMonthChange={onMonthChange} />);

		await vi.waitFor(() => {
			expect(onMonthChange).toHaveBeenLastCalledWith("2026-12");
		});
	});

	it("given_aSuggestedMonth_when_theMonthWasChosenByHand_then_itStays", async () => {
		const user = userEvent.setup();
		const onMonthChange = vi.fn();
		const { rerender } = render(<Harness onMonthChange={onMonthChange} />);
		await user.click(screen.getByRole("button", { name: /Month/ }));
		await user.click(
			await screen.findByRole("option", { name: "January 2027" })
		);

		rerender(
			<Harness suggestedMonth="2026-12" onMonthChange={onMonthChange} />
		);

		expect(onMonthChange).toHaveBeenLastCalledWith("2027-01");
		expect(onMonthChange).not.toHaveBeenCalledWith("2026-12");
	});

	it("given_nothingChosen_when_submitted_then_asksForADepartment", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		render(<Harness onSubmit={onSubmit} />);

		await user.click(screen.getByRole("button", { name: "Next" }));

		expect(await screen.findByText("Choose a department.")).toBeVisible();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("given_everythingChosen_when_submitted_then_givesTheValuesAndToldTheDepartment", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn();
		const onDepartmentChange = vi.fn();
		render(
			<Harness onDepartmentChange={onDepartmentChange} onSubmit={onSubmit} />
		);

		await user.click(screen.getByRole("button", { name: /Department/ }));
		await user.click(await screen.findByRole("option", { name: "Kitchen" }));
		await user.click(screen.getByRole("button", { name: "Next" }));

		await vi.waitFor(() => {
			expect(onSubmit).toHaveBeenCalledOnce();
		});
		expect(onSubmit.mock.calls[0]?.[0]).toEqual({
			departmentId: "d-2",
			month: "2026-11",
			includeLeave: true,
		});
		expect(onDepartmentChange).toHaveBeenLastCalledWith("d-2");
	});

	it("given_additionalSettings_when_shown_then_onlyIncludeLeaveRequestsAndNoOpenShiftsSwitch", () => {
		render(<Harness onSubmit={vi.fn()} />);

		expect(
			screen.getByRole("checkbox", { name: "Include approved leave" })
		).toBeInTheDocument();
		expect(screen.queryByRole("checkbox", { name: /open shifts/i })).toBeNull();
	});
});
