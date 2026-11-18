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

/** Front Desk published through 22 Nov, two schedules to review, scheduled to 6 Dec. */
const frontDesk: DepartmentCardEntry = {
	departmentId: "d-1",
	departmentName: "Front Desk",
	publishedUpTo: "2026-11-22",
	publishedStanding: "upTo",
	toReviewCount: 2,
	scheduledUpTo: "2026-12-06",
	nextToReview: "Week of 23 Nov",
	dayStrip: [{ day: TODAY, mark: "published" }],
};

/** A Department with no schedule at all. */
const security: DepartmentCardEntry = {
	departmentId: "d-2",
	departmentName: "Security",
	publishedUpTo: undefined,
	publishedStanding: "nothing",
	toReviewCount: 0,
	scheduledUpTo: undefined,
	nextToReview: undefined,
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
		expect(card).toHaveTextContent("2 schedules to review");
		expect(card).toHaveTextContent("Nothing scheduled after Dec 6");
		expect(card).toHaveTextContent(
			"Week of 23 Nov is waiting for your review."
		);
	});

	it("given_aDepartmentWithNoSchedule_when_rendered_then_saysNothingYet", async () => {
		const card = await renderCard(security);

		expect(card).toHaveTextContent("Nothing published yet");
		expect(card).toHaveTextContent("Nothing to review");
		expect(card).toHaveTextContent("No schedule yet");
		expect(card).toHaveTextContent("Nothing is waiting for you.");
	});

	it("given_publishedOnlyLater_when_rendered_then_saysNotPublishedFromThisWeek", async () => {
		const card = await renderCard({
			...security,
			publishedStanding: "notFromThisWeek",
		});

		expect(card).toHaveTextContent("Not published from this week");
		expect(card).not.toHaveTextContent("Nothing published yet");
	});

	it("given_openSchedule_when_rendered_then_linksToTheDepartmentTimeline", async () => {
		const card = await renderCard(frontDesk);

		expect(
			within(card).getByRole("link", { name: "Open the Front Desk schedule" })
		).toHaveAttribute("href", "/scheduling/department?department=d-1");
	});
});
