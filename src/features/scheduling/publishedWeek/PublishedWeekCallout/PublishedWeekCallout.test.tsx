import { render, screen, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	PublishedWeekCallout,
	type PublishedWeekCalloutProps,
} from "@/features/scheduling/publishedWeek/PublishedWeekCallout";

const show = (stage: PublishedWeekCalloutProps["stage"]): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<MemoryRouterHarness>
				<PublishedWeekCallout publishedScheduleId="s-9" stage={stage} />
			</MemoryRouterHarness>
		</I18nextProvider>
	);
};

describe("PublishedWeekCallout", () => {
	it("given_theWeekIsStillBeingPicked_when_shown_then_warnsToPickAnotherWeekAndLinksTheRoster", async () => {
		show("setup");

		const note = await screen.findByRole("note");
		expect(note).toHaveClass("bg-warning-50");
		expect(note).toHaveTextContent(
			"This week already has a published roster for this department. Only one roster can be published per week, so pick another week to make a new one."
		);
		expect(
			within(note).getByRole("link", { name: "Open the published roster" })
		).toHaveAttribute("href", "/scheduling/s-9");
	});

	it("given_theScheduleIsBlocked_when_shown_then_saysItCantBeGeneratedOrPublished", async () => {
		show("blocked");

		const note = await screen.findByRole("note");
		expect(note).toHaveTextContent(
			"This week already has a published roster for this department. Only one roster can be published per week, so this schedule can’t be generated or published."
		);
		expect(note).not.toHaveTextContent(/delet|edit/i);
	});
});
