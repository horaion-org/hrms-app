import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { StartingDays } from "@/features/scheduling/startingContext/api";
import {
	carriedWeek,
	firstWeek,
} from "@/features/scheduling/startingContext/fixtures";
import { StartingContextCallout } from "@/features/scheduling/startingContext/StartingContextCallout";
import { previousWeekOf } from "@/features/scheduling/startingContext/startingGrid";

const show = (
	week: StartingDays,
	enteredCount: number,
	onAdd?: () => void,
	unknownDays?: Array<string>
): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<StartingContextCallout
				enteredCount={enteredCount}
				previous={previousWeekOf(week)}
				unknownDays={unknownDays}
				onAdd={onAdd}
			/>
		</I18nextProvider>
	);
};

describe("StartingContextCallout", () => {
	it("given_noPreviousRosterAndNothingEntered_when_shown_then_warnsWhatIsUnknownAndOffersAButton", async () => {
		const onAdd = vi.fn();
		show(firstWeek(), 0, onAdd);

		const note = screen.getByRole("note");
		expect(note).toHaveClass("bg-warning-50");
		expect(note).toHaveTextContent(
			"Horaion doesn’t know what people worked last week." +
				"Without it, everyone is treated as rested, so someone who worked Sunday night could be given Monday morning." +
				"Add last week’s shifts"
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Add last week’s shifts" })
		);
		expect(onAdd).toHaveBeenCalledOnce();
	});

	it("given_daysEnteredForOnePerson_when_shown_then_calmlySaysSoAndOffersToEditThem", async () => {
		const onAdd = vi.fn();
		show(firstWeek(), 1, onAdd);

		const note = screen.getByRole("note");
		expect(note).toHaveClass("bg-ink-blue-50");
		expect(note).toHaveTextContent(
			"No roster before this week. Days are added for 1 person; everyone else starts rested."
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Edit last week’s shifts" })
		);
		expect(onAdd).toHaveBeenCalledOnce();
	});

	it("given_aWeekThatHasBegunAndNothingEntered_when_shown_then_oneWarningNamesItsUnknownDaysWithTheButton", () => {
		show(firstWeek(), 0, vi.fn(), ["2026-11-09", "2026-11-10"]);

		const note = screen.getByRole("note");
		expect(note).toHaveClass("bg-warning-50");
		expect(note).toHaveTextContent(
			"Horaion doesn’t know what people worked on Mon, Nov 9 and Tue, Nov 10, or the week before." +
				"Mark any rest days already given, so the week’s rest day counts them. Left unknown, they count as days nobody worked." +
				"Add last week’s shifts"
		);
	});

	it("given_daysEnteredButSomeOfThisWeeksDaysStillUnknown_when_shown_then_theCalmLineNamesThem", () => {
		show(firstWeek(), 1, vi.fn(), ["2026-11-10"]);

		const note = screen.getByRole("note");
		expect(note).toHaveClass("bg-ink-blue-50");
		expect(note).toHaveTextContent(
			"Still unknown for some people: Tue, Nov 10. Left unknown, they count as days nobody worked."
		);
	});

	it("given_aPreviousRosterMissingANewJoiner_when_shown_then_carriedOverWithTheNewJoinerNamedAndASmallLink", () => {
		show(carriedWeek(), 0, vi.fn());

		const note = screen.getByRole("note");
		expect(note).toHaveClass("bg-ink-blue-50");
		expect(note).toHaveTextContent(
			"Carried over from the week of Nov 2. 1 person isn’t on that roster and starts rested."
		);
		expect(
			screen.getByRole("button", { name: "Edit last week’s shifts" })
		).toHaveClass("text-ink-blue-700");
	});

	it("given_aDraftThePersonMayNotChange_when_shown_then_stillWarnsButOffersNoControl", () => {
		show(firstWeek(), 0);

		expect(screen.getByRole("note")).toHaveTextContent(
			"Horaion doesn’t know what people worked last week."
		);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});
