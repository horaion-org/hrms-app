import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import type { ApprovalInstance } from "@/features/approvals/api";
import { approvalInstanceFixture } from "@/features/approvals/fixtures";
import type { ScheduleMonthSummary } from "@/features/scheduling/months/api";
import { monthSummaryFixture } from "@/features/scheduling/months/fixtures";
import { MonthCard } from "@/features/scheduling/months/MonthCard";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

// Dates read as the test browser (en-US) writes them.
const renderCard = async ({
	summary = monthSummaryFixture(),
	waitingOnMe = [],
}: {
	summary?: ScheduleMonthSummary;
	waitingOnMe?: Array<ApprovalInstance>;
}): Promise<HTMLElement> => {
	render(
		<MemoryRouterHarness>
			<MonthCard summary={summary} waitingOnMe={waitingOnMe} />
		</MemoryRouterHarness>
	);
	return screen.findByRole("region", { name: "Kitchen" });
};

describe("MonthCard", () => {
	it("given_kitchensNovember_when_rendered_then_countsTheWeeksAndPointsAtTheWeekUnderReview", async () => {
		const card = await renderCard({});

		expect(card).toHaveTextContent("1 published · 3 to review");
		expect(
			within(card).getByRole("img", {
				name: "1 published · 3 to review",
			})
		).toBeInTheDocument();
		expect(card).toHaveTextContent("Week of Nov 9 is waiting for your review.");
	});

	it("given_openMonth_when_rendered_then_linksToTheMonthPageOfTheDepartment", async () => {
		const card = await renderCard({});

		expect(
			within(card).getByRole("link", { name: "Open Kitchen, November 2026" })
		).toHaveAttribute("href", "/scheduling/months/2026-11?department=d-1");
	});

	it("given_aWeekWaitingOnTheViewer_when_rendered_then_saysWhichWeekAndItsStep", async () => {
		const card = await renderCard({
			waitingOnMe: [approvalInstanceFixture({ subjectId: "s-2" })],
		});

		expect(card).toHaveTextContent(
			"Week of Nov 9: waiting on you · step 1 of 2 (Endorse)"
		);
	});

	it("given_aNamedDatesSchedule_when_shown_then_itsNameAndDates", async () => {
		const part = {
			name: "Year-end gala",
			named: true,
			state: "TO_REVIEW" as const,
			redoing: false,
		};
		const summary = monthSummaryFixture();
		const card = await renderCard({
			summary: {
				...summary,
				weeks: summary.weeks.map((week) =>
					week.periodStart === "2026-11-16"
						? {
								...week,
								parts: [
									{
										...part,
										scheduleId: "s-3",
										coveredFrom: "2026-11-19",
										coveredTo: "2026-11-22",
									},
								],
							}
						: week.periodStart === "2026-11-23"
							? {
									...week,
									parts: [
										{
											...part,
											scheduleId: "s-4",
											coveredFrom: "2026-11-23",
											coveredTo: "2026-11-28",
										},
									],
								}
							: week
				),
			},
		});

		expect(card).toHaveTextContent(/Year-end gala · Nov 19\s?–\s?28/);
	});

	it("given_twoDrafts_when_rendered_then_saysDraftsInThePlural", async () => {
		const card = await renderCard({
			summary: monthSummaryFixture({
				weeks: [
					{ periodStart: "2026-11-02", state: "DRAFT", scheduleId: "s-1" },
					{ periodStart: "2026-11-09", state: "DRAFT", scheduleId: "s-2" },
				],
			}),
		});

		expect(card).toHaveTextContent("2 drafts");
		expect(card).not.toHaveTextContent("waiting");
	});
});
