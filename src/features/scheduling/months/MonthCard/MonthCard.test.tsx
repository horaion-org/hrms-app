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
	reviewMonth,
	waitingOnMe = [],
}: {
	summary?: ScheduleMonthSummary;
	reviewMonth?: string;
	waitingOnMe?: Array<ApprovalInstance>;
}): Promise<HTMLElement> => {
	render(
		<MemoryRouterHarness>
			<MonthCard
				reviewMonth={reviewMonth}
				summary={summary}
				waitingOnMe={waitingOnMe}
			/>
		</MemoryRouterHarness>
	);
	return screen.findByRole("region", { name: "Kitchen" });
};

describe("MonthCard", () => {
	it("given_kitchensNovember_when_rendered_then_countsTheWeeksAndPointsAtTheWeekUnderReview", async () => {
		const card = await renderCard({});

		expect(card).toHaveTextContent("1 published · 1 to review · 2 tentative");
		expect(
			within(card).getByRole("img", {
				name: "1 published · 1 to review · 2 tentative",
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

	it("given_aMonthGeneratedAhead_when_rendered_then_saysTheEarlierMonthComesFirst", async () => {
		const card = await renderCard({
			summary: monthSummaryFixture({
				month: "2026-12",
				weeks: [
					{ periodStart: "2026-12-07", state: "TENTATIVE", scheduleId: "s-6" },
					{ periodStart: "2026-12-14", state: "PUBLISHED", scheduleId: "s-7" },
				],
			}),
			reviewMonth: "2026-11",
		});

		expect(card).toHaveTextContent("1 published · 1 tentative");
		expect(card).toHaveTextContent("Generated ahead. November comes first.");
	});

	it("given_aWeekWaitingOnTheViewer_when_rendered_then_saysWhichWeekAndItsStep", async () => {
		const card = await renderCard({
			waitingOnMe: [approvalInstanceFixture({ subjectId: "s-2" })],
		});

		expect(card).toHaveTextContent(
			"Week of Nov 9: waiting on you · step 1 of 2 (Endorse)"
		);
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
