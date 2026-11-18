import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import type { DepartmentCardEntry } from "@/features/scheduling/schedules/departmentCards";
import { DepartmentCard } from "@/features/scheduling/schedules/DepartmentCard";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const TODAY = "2026-11-18";

/** Front Desk published through 22 Nov, five days to review from 25 Nov, rostered to 6 Dec. */
const frontDesk: DepartmentCardEntry = {
	departmentId: "d-1",
	departmentName: "Front Desk",
	publishedUpTo: "2026-11-22",
	publishedStanding: "upTo",
	toReviewDays: 5,
	waitingDays: { from: "2026-11-25", to: "2026-11-29" },
	scheduledUpTo: "2026-12-06",
	firstToReviewDay: "2026-11-25",
	dayStrip: [{ day: TODAY, mark: "published" }],
};

/** A Department with no schedule at all. */
const security: DepartmentCardEntry = {
	departmentId: "d-2",
	departmentName: "Security",
	publishedUpTo: undefined,
	publishedStanding: "nothing",
	toReviewDays: 0,
	waitingDays: undefined,
	scheduledUpTo: undefined,
	firstToReviewDay: undefined,
	dayStrip: [{ day: TODAY, mark: "none" }],
};

// Dates read as the test browser (en-US) writes them.
const renderCard = async (card: DepartmentCardEntry): Promise<HTMLElement> => {
	render(
		<MemoryRouterHarness>
			<DepartmentCard card={card} today={TODAY} />
		</MemoryRouterHarness>
	);
	return screen.findByRole("region", { name: card.departmentName });
};

describe("DepartmentCard", () => {
	it("given_aDepartmentWithSchedules_when_rendered_then_saysHowFarItIsCoveredAndWhatWaits", async () => {
		const card = await renderCard(frontDesk);

		expect(card).toHaveTextContent("Published up to Nov 22");
		expect(card).toHaveTextContent("5 days to review");
		expect(card).toHaveTextContent("Nothing rostered after Dec 6");
		expect(card).toHaveTextContent(
			/Nov 25\s?–\s?29, 2026 are waiting for you to publish\./
		);
	});

	it("given_oneDayToReview_when_rendered_then_theDayIsWaiting", async () => {
		const card = await renderCard({
			...frontDesk,
			toReviewDays: 1,
			waitingDays: { from: "2026-11-25", to: "2026-11-25" },
		});

		expect(card).toHaveTextContent("1 day to review");
		expect(card).toHaveTextContent(
			"Nov 25, 2026 is waiting for you to publish."
		);
	});

	it("given_aDepartmentWithNoSchedule_when_rendered_then_saysNothingYet", async () => {
		const card = await renderCard(security);

		expect(card).toHaveTextContent("Nothing published yet");
		expect(card).toHaveTextContent("Nothing to review");
		expect(card).toHaveTextContent("No roster yet");
		expect(card).toHaveTextContent("Nothing is waiting for you.");
	});

	it("given_daysInAnotherYear_when_rendered_then_theyNameTheirYear", async () => {
		const card = await renderCard({
			...frontDesk,
			scheduledUpTo: "2027-12-05",
		});

		expect(card).toHaveTextContent("Published up to Nov 22");
		expect(card).toHaveTextContent("Nothing rostered after Dec 5, 2027");
	});

	it("given_publishedOnlyLater_when_rendered_then_saysNotPublishedFromThisWeek", async () => {
		const card = await renderCard({
			...security,
			publishedStanding: "notFromThisWeek",
		});

		expect(card).toHaveTextContent("Not published from this week");
		expect(card).not.toHaveTextContent("Nothing published yet");
	});

	it("given_openRoster_when_rendered_then_linksToTheDepartmentTimeline", async () => {
		const card = await renderCard(frontDesk);

		expect(
			within(card).getByRole("link", { name: "Open the Front Desk roster" })
		).toHaveAttribute("href", "/scheduling/department?department=d-1");
	});

	/** Each line that names a day opens the timeline on that day's week; the others stay plain text. */
	it.each([
		["Published up to Nov 22", "Nov 22", "2026-11-16"],
		["5 days to review", "Nov 25", "2026-11-23"],
		["Nothing rostered after Dec 6", "Dec 6", "2026-11-30"],
	])("links %s to the week of %s", async (text, day, from) => {
		const card = await renderCard(frontDesk);
		const link = within(card).getByRole("link", {
			name: `Open the Front Desk roster at ${day}`,
		});
		expect(link).toHaveTextContent(text);
		expect(link).toHaveAttribute(
			"href",
			`/scheduling/department?department=d-1&from=${from}`
		);
	});

	it("leaves the lines that name no day as plain text", async () => {
		const card = await renderCard(security);
		expect(within(card).getAllByRole("link")).toHaveLength(1);
		expect(card).toHaveTextContent("Nothing published yet");
	});
});
