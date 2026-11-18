import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
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
} from "@/features/scheduling/createSchedule/MonthSetupStep";
import { schedulingWorkspace } from "@/features/scheduling/schedules/fixtures";
import {
	datesPlanFixture,
	datesPlanRedoingFixture,
	datesPlanWithKeptWeekFixture,
} from "@/features/scheduling/dates/fixtures";
import { workspaceQuery } from "@/features/workspace/api";

const DEFAULTS = {
	departmentId: "",
	scheduleFor: "month" as const,
	month: "2026-11",
	firstDay: "",
	lastDay: "",
	name: "",
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

	it("given_aTickedStartedWeek_when_shown_then_saysItIsGeneratedFromToday", () => {
		render(
			<Harness
				dates={{ plan: undefined, pending: false, today: TODAY }}
				weeks={weeksProp(novemberWeeks(), ["2026-11-16"])}
			/>
		);

		expect(
			screen.getByText(
				"Mon, Nov 16 to Sun, Nov 22 has already started. It is generated from today on: Tue, Nov 17 to Sun, Nov 22."
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

	it("given_theDefaultMonthChosenByHandAfterAnother_when_aNewSuggestionArrives_then_theChosenMonthStays", async () => {
		const user = userEvent.setup();
		const onMonthChange = vi.fn();
		const { rerender } = render(
			<Harness suggestedMonth="2026-12" onMonthChange={onMonthChange} />
		);
		await vi.waitFor(() => {
			expect(onMonthChange).toHaveBeenLastCalledWith("2026-12");
		});
		await user.click(screen.getByRole("button", { name: /Month/ }));
		await user.click(
			await screen.findByRole("option", { name: "January 2027" })
		);
		await user.click(screen.getByRole("button", { name: /Month/ }));
		await user.click(
			await screen.findByRole("option", { name: "November 2026" })
		);

		// November is the form's default: chosen by hand, it still holds.
		rerender(
			<Harness suggestedMonth="2027-01" onMonthChange={onMonthChange} />
		);

		expect(onMonthChange).toHaveBeenLastCalledWith("2026-11");
		expect(screen.getByRole("button", { name: /Month/ })).toHaveTextContent(
			"November 2026"
		);
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
			...DEFAULTS,
			departmentId: "d-2",
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

	describe("schedule for dates", () => {
		const DATES = {
			...DEFAULTS,
			departmentId: "d-1",
			scheduleFor: "dates" as const,
			firstDay: "2026-11-19",
			lastDay: "2026-11-28",
		};
		const datesProp = (
			plan = datesPlanFixture()
		): MonthSetupStepProps["dates"] => ({ plan, pending: false, today: TODAY });

		it("given_eachChoice_when_shown_then_theSetupLineSpeaksOfItsDaysOrMonth", () => {
			const { unmount } = render(<Harness />);
			expect(
				screen.getByText("Select the department and the month to generate.")
			).toBeInTheDocument();
			unmount();

			render(<Harness dates={datesProp()} defaultValues={DATES} />);
			expect(
				screen.getByText("Select the department and the days to generate.")
			).toBeInTheDocument();
		});

		it("given_aNewSetup_when_shown_then_monthIsChosen", () => {
			render(<Harness />);

			expect(screen.getByRole("tab", { name: "Month" })).toHaveAttribute(
				"aria-selected",
				"true"
			);
			expect(screen.queryByText("First day")).toBeNull();
		});

		it("given_monthChosen_when_shown_then_theMonthFieldComesAfterTheChoice", () => {
			render(<Harness />);

			const choice = screen.getByRole("tablist", { name: "Schedule for" });
			expect(
				choice.compareDocumentPosition(
					screen.getByRole("button", { name: /Month/ })
				) & Node.DOCUMENT_POSITION_FOLLOWING
			).toBeTruthy();
		});

		it("given_datesChosen_when_shown_then_theFirstDayFieldComesAfterTheChoice", () => {
			render(<Harness dates={datesProp()} defaultValues={DATES} />);

			const choice = screen.getByRole("tablist", { name: "Schedule for" });
			expect(
				choice.compareDocumentPosition(screen.getByText("First day")) &
					Node.DOCUMENT_POSITION_FOLLOWING
			).toBeTruthy();
		});

		it("given_datesChosen_when_shown_then_firstLastNameAndThePlanRows", async () => {
			const user = userEvent.setup();
			const onDatesChange = vi.fn();
			render(<Harness dates={datesProp()} onDatesChange={onDatesChange} />);

			await user.click(screen.getByRole("tab", { name: "Dates" }));

			expect(screen.getByText("First day")).toBeInTheDocument();
			expect(screen.getByText("Last day")).toBeInTheDocument();
			expect(
				screen.getByText("Optional. Shown on the weeks these dates create.")
			).toBeInTheDocument();
			const table = screen.getByRole("table", { name: "What this creates" });
			expect(within(table).getAllByRole("row")).toHaveLength(3);
			expect(
				within(table).getByText(/^Nov 19\s?–\s?22, 2026 with your choices$/)
			).toBeInTheDocument();
			expect(within(table).getAllByText("New")).toHaveLength(2);
			expect(
				screen.getByText(/^10 days to generate, Nov 19\s?–\s?28, 2026$/)
			).toBeInTheDocument();
			expect(onDatesChange).toHaveBeenLastCalledWith({
				scheduleFor: "dates",
				firstDay: "",
				lastDay: "",
				name: "",
			});
		});

		it("given_aPastFirstDay_when_validated_then_saysChooseTodayOrLater", async () => {
			const user = userEvent.setup();
			render(
				<Harness
					dates={datesProp()}
					defaultValues={{ ...DATES, firstDay: "2026-11-16" }}
				/>
			);

			await user.click(screen.getByRole("button", { name: "Next" }));

			expect(
				await screen.findByText(
					"Choose today (Tue, Nov 17) or a later first day. Days that have passed cannot be scheduled."
				)
			).toBeInTheDocument();
		});

		it("given_32Days_when_validated_then_namesTheLastDayAllowed", async () => {
			const user = userEvent.setup();
			render(
				<Harness
					dates={datesProp()}
					defaultValues={{ ...DATES, lastDay: "2026-12-20" }}
				/>
			);

			await user.click(screen.getByRole("button", { name: "Next" }));

			expect(
				await screen.findByText(
					"That is 32 days. A schedule by dates covers up to 31 days. Choose a last day on or before Sat, Dec 19, or make a second schedule for the rest."
				)
			).toBeInTheDocument();
		});

		it("given_theLastDayBeforeTheFirst_when_theFirstDayIsMovedBeforeIt_then_theErrorClears", async () => {
			const user = userEvent.setup();
			render(
				<Harness
					dates={datesProp()}
					defaultValues={{
						...DATES,
						firstDay: "2026-11-25",
						lastDay: "2026-11-20",
					}}
				/>
			);
			await user.click(screen.getByRole("button", { name: "Next" }));
			const reversed = /^The last day is before the first day\./;
			expect(await screen.findByText(reversed)).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: /^First day/ }));
			await user.click(
				screen.getByRole("gridcell", { name: /19 November 2026/ })
			);

			await waitFor(() => {
				expect(screen.queryByText(reversed)).toBeNull();
			});
		});

		it("given_aPlanWithKeptDays_when_shown_then_warnsTheyStay", () => {
			render(
				<Harness
					dates={datesProp(datesPlanWithKeptWeekFixture())}
					defaultValues={DATES}
				/>
			);

			expect(
				screen.getByText(/^Nov 23\s?–\s?29, 2026 stay as they are$/)
			).toBeInTheDocument();
			expect(screen.getByText("Kept")).toBeInTheDocument();
			expect(
				screen.getByText(
					/^Nov 23\s?–\s?28, 2026 have been published and stay as they are\.$/
				)
			).toBeInTheDocument();
		});

		it("given_newDaysBeforeALaterPart_when_shown_then_saysItsDaysAreScheduledAgainAfterTheNewDays", () => {
			const plan = datesPlanFixture();
			const week = {
				...plan.weeks[0]!,
				rest: [
					{
						scheduleId: "s-2",
						coveredFrom: "2026-11-23",
						coveredTo: "2026-11-29",
						state: "TO_REVIEW" as const,
					},
				],
			};
			render(
				<Harness
					dates={datesProp({ ...plan, weeks: [week] })}
					defaultValues={DATES}
				/>
			);

			expect(
				screen.getByText(
					/^Nov 23\s?–\s?29, 2026 are scheduled again after the new days are ready\.$/
				)
			).toBeInTheDocument();
			expect(
				screen.queryByText(/already have a schedule\. It stays/)
			).toBeNull();
		});

		it("given_aWeekToRedoWithHandChanges_when_shown_then_saysTheyWillBeReplaced", () => {
			const plan = datesPlanRedoingFixture();
			const [week] = plan.weeks;
			const withChanges = {
				...plan,
				weeks: [
					{
						...week!,
						redone: week!.redone.map((part) => ({
							...part,
							handChangedDays: 2,
						})),
						rest: week!.rest.map((part) => ({ ...part, handChangedDays: 1 })),
					},
				],
			};
			render(
				<Harness
					dates={datesProp(withChanges)}
					defaultValues={{
						...DATES,
						firstDay: "2026-11-18",
						lastDay: "2026-11-19",
					}}
				/>
			);

			expect(
				within(
					screen.getByRole("table", { name: "What this creates" })
				).getByText(
					"3 changes made by hand to this week’s roster will be replaced."
				)
			).toBeInTheDocument();
		});

		it("given_aWeekToRedoWithoutHandChanges_when_shown_then_noHandChangeLine", () => {
			render(
				<Harness
					dates={datesProp(datesPlanRedoingFixture())}
					defaultValues={{
						...DATES,
						firstDay: "2026-11-18",
						lastDay: "2026-11-19",
					}}
				/>
			);

			expect(screen.queryByText(/made by hand/)).toBeNull();
		});

		it("given_aRedoPlan_when_shown_then_saysWhichDaysStayWhichAreRedoneWithYourChoicesAndWhichWithTheWeeksOwn", () => {
			render(
				<Harness
					dates={datesProp(datesPlanRedoingFixture())}
					defaultValues={{
						...DATES,
						firstDay: "2026-11-18",
						lastDay: "2026-11-19",
					}}
				/>
			);

			const table = screen.getByRole("table", { name: "What this creates" });
			expect(
				within(table).getByText(/^Nov 16\s?–\s?17, 2026 stay as they are$/)
			).toBeInTheDocument();
			expect(
				within(table).getByText(
					/^Nov 18\s?–\s?19, 2026 scheduled again with your choices$/
				)
			).toBeInTheDocument();
			expect(
				within(table).getByText(
					/^Nov 20\s?–\s?22, 2026 scheduled again with the week’s own shifts and rules$/
				)
			).toBeInTheDocument();
			expect(within(table).getByText("To redo")).toBeInTheDocument();
			expect(
				within(table).getByText(
					/^This week will be 3 schedules: Nov 16\s?–\s?17, 2026, Nov 18\s?–\s?19, 2026,? and Nov 20\s?–\s?22, 2026\. Each is reviewed and published on its own\.$/
				)
			).toBeInTheDocument();
			expect(
				screen.getByText(
					"3 more days after them, scheduled again with their week’s own shifts and rules"
				)
			).toBeInTheDocument();
			expect(
				screen.getByText(
					/^Nov 18\s?–\s?19, 2026 already have a schedule\. It stays until the new days are ready\. Then they are replaced, and the rest of their week is scheduled again\. Days that have been published are never touched\.$/
				)
			).toBeInTheDocument();
		});

		it("given_aRedoPlan_when_shown_then_theDaysStripReadsKeptDaysApartFromGeneratedOnes", () => {
			render(
				<Harness
					dates={datesProp(datesPlanRedoingFixture())}
					defaultValues={{
						...DATES,
						firstDay: "2026-11-18",
						lastDay: "2026-11-19",
					}}
				/>
			);

			const table = screen.getByRole("table", { name: "What this creates" });
			expect(within(table).getByRole("img")).toHaveAccessibleName(
				"Monday already scheduled, stays as it is, Tuesday already scheduled, stays as it is, Wednesday covered, Thursday covered, Friday covered, Saturday covered, Sunday covered"
			);
		});

		it("given_aPlanRefusedAllTaken_when_shown_then_saysChooseALaterFirstDay", () => {
			const plan = datesPlanFixture({
				newDays: 0,
				refusal: {
					code: "SCHEDULE_DAYS_ALL_TAKEN",
					days: { from: "2026-11-19", to: "2026-11-28" },
					scheduledDays: null,
				},
			});
			render(<Harness dates={datesProp(plan)} defaultValues={DATES} />);

			expect(
				screen.getByText(
					"Every day from Thu, Nov 19 to Sat, Nov 28 has been published, so nothing would change. Choose a first day after Sat, Nov 28."
				)
			).toBeInTheDocument();
		});

		it("given_aPlanRefusedBeforePublishedDays_when_shown_then_theRefusalOnlyAndNoPlanOfARunThatWontHappen", () => {
			const plan = {
				...datesPlanRedoingFixture(),
				refusal: {
					code: "SCHEDULE_DAYS_BEFORE_ROSTER",
					days: { from: "2026-11-18", to: "2026-11-19" },
					scheduledDays: { from: "2026-11-20", to: "2026-11-22" },
				},
			};
			render(
				<Harness
					dates={datesProp(plan)}
					defaultValues={{
						...DATES,
						firstDay: "2026-11-18",
						lastDay: "2026-11-19",
					}}
				/>
			);

			expect(
				screen.getByText(/which have been published and stay as they are\./)
			).toBeInTheDocument();
			expect(
				screen.queryByRole("table", { name: "What this creates" })
			).toBeNull();
			expect(screen.queryByText(/This week will be/)).toBeNull();
			expect(screen.queryByText(/\d+ days? to generate/)).toBeNull();
			expect(
				screen.queryByText(/It stays until the new days are ready/)
			).toBeNull();
		});
	});
});
