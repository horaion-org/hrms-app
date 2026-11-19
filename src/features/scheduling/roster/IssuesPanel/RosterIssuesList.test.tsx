import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { rosterIssuesFixture } from "@/features/scheduling/roster/rosterIssueFixtures";
import { RosterIssuesList, type RosterIssuesListProps } from "./RosterIssuesList";

/*
 * The fixture's four issues: a shift short, a must broken, a rule not met
 * and a note, drawn as the Issues panel's rows.
 */

const show = (
	props: Partial<RosterIssuesListProps> = {}
): RosterIssuesListProps => {
	const all: RosterIssuesListProps = {
		issues: rosterIssuesFixture(),
		shiftName: () => "Front Desk AM",
		onShow: vi.fn(),
		...props,
	};
	render(
		<I18nextProvider i18n={authTestI18n}>
			<RosterIssuesList {...all} />
		</I18nextProvider>
	);
	return all;
};

/** Each row's button text, top to bottom. */
const rowTexts = (): Array<string | null> =>
	screen
		.getAllByRole("listitem")
		.map((row) => within(row).getAllByRole("button")[0]!.textContent);

describe("RosterIssuesList", () => {
	it("given_issues_when_shown_then_oneRowEachMustFixFirstInDateOrderWithItsAction", () => {
		show();

		expect(rowTexts()).toEqual([
			"Must fixRules brokenAisha Rahman · Wed, Oct 14Details",
			"Must fix1 Front Desk Staff shortSat, Oct 17 · Front Desk AM 09:00–15:00Cover",
			"If possibleAsked if possibleBen OrtizDetails",
			"NoteDays before changed5 people’s days before this week changedDetails",
		]);
	});

	it("given_theFilters_when_chosen_then_onlyThatSeverityShowsAndAnEmptyOneSaysSo", async () => {
		const user = userEvent.setup();
		show({ issues: rosterIssuesFixture().slice(0, 2) });

		await user.click(screen.getByRole("button", { name: "Must fix" }));
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
		expect(screen.getByRole("button", { name: "Must fix" })).toHaveAttribute(
			"aria-pressed",
			"true"
		);

		await user.click(screen.getByRole("button", { name: "If possible" }));
		expect(screen.queryAllByRole("listitem")).toHaveLength(0);
		expect(screen.getByText("Nothing here.")).toBeVisible();

		await user.click(screen.getByRole("button", { name: "All" }));
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
	});

	it("given_aRow_when_pressed_then_itOpensInlineAndAnotherClosesIt", async () => {
		const user = userEvent.setup();
		const { onShow } = show();
		const must = screen.getByRole("button", { name: /^Must fixRules broken/ });

		await user.click(must);
		expect(must).toHaveAttribute("aria-expanded", "true");
		expect(must).toHaveTextContent(/Close$/);
		expect(
			screen.getByText(
				"Only 9 hours of rest between shifts, at least 11. Rule: Rest between shifts"
			)
		).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Show" }));
		expect(onShow).toHaveBeenCalledWith(rosterIssuesFixture()[1]);

		const gap = screen.getByRole("button", { name: /1 Front Desk Staff short/ });
		await user.click(gap);
		expect(must).toHaveAttribute("aria-expanded", "false");
		expect(gap).toHaveAttribute("aria-expanded", "true");
	});

	it("given_aRosterThatCannotBeChanged_when_aShortShiftOpens_then_itsSentenceAndNoOptions", async () => {
		const user = userEvent.setup();
		show();

		await user.click(
			screen.getByRole("button", { name: /1 Front Desk Staff short/ })
		);

		expect(screen.queryByRole("button", { name: "Review" })).toBeNull();
		expect(screen.getByText("Rule: Early front desk")).toBeVisible();
	});

	it("given_aRuleAskedIfPossible_when_itsRowOpens_then_theEnginesSentenceAndNothingToApply", async () => {
		const user = userEvent.setup();
		show();

		await user.click(screen.getByRole("button", { name: /^If possibleAsked/ }));

		expect(screen.getByText("Works Saturday. Rule: Weekends off")).toBeVisible();
		expect(screen.queryByRole("button", { name: /Apply/ })).toBeNull();
	});
});
