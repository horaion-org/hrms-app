import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { StartingDays } from "@/features/scheduling/startingContext/api";
import {
	answeredWeek,
	carriedWeek,
	enteredOffCell,
	firstWeek,
	leaveCell,
	nothingAskedWeek,
	rosterOffCell,
	unknownCell,
	WEEK_BEFORE,
} from "@/features/scheduling/startingContext/fixtures";
import { StartingContextCallout } from "@/features/scheduling/startingContext/StartingContextCallout";

const show = (
	week: StartingDays,
	enteredCount: number,
	onAdd?: () => void,
	readOnly?: boolean
): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<StartingContextCallout
				enteredCount={enteredCount}
				readOnly={readOnly}
				week={week}
				onAdd={onAdd}
			/>
		</I18nextProvider>
	);
};

describe("StartingContextCallout", () => {
	it("given_noPreviousRoster_when_shown_then_saysEveryoneStartsRestedAndOffersLastWeek", async () => {
		const onAdd = vi.fn();
		show(nothingAskedWeek(), 0, onAdd);

		const note = screen.getByRole("note");
		expect(note).toHaveTextContent(
			"No roster before this week. Everyone starts rested."
		);
		expect(note).toHaveClass("bg-ink-blue-50");
		await userEvent.click(
			screen.getByRole("button", { name: "Add last week" })
		);
		expect(onAdd).toHaveBeenCalledOnce();
	});

	it("given_daysEnteredForOnePerson_when_shown_then_saysSoAndOffersToEdit", () => {
		show(answeredWeek(), 1, vi.fn());

		expect(screen.getByRole("note")).toHaveTextContent(
			"No roster before this week. Days are added for 1 person; everyone else starts rested."
		);
		expect(
			screen.getByRole("button", { name: "Edit last week" })
		).toBeInTheDocument();
	});

	it("given_aPreviousRosterWhereNobodyIsAsked_when_shown_then_carriedOverQuietly", () => {
		const week = carriedWeek();
		show(
			{
				...week,
				members: [
					{ ...week.members[0]!, cells: WEEK_BEFORE.map(rosterOffCell) },
				],
			},
			0,
			vi.fn()
		);

		const note = screen.getByRole("note");
		expect(note).toHaveTextContent("Carried over from the week of Nov 2.");
		expect(note).toHaveClass("bg-ink-blue-50");
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("given_aNewJoinerWithDaysAdded_when_shown_then_saysSoAndStillOffersToEdit", () => {
		const week = carriedWeek();
		show(
			{
				...week,
				members: [
					week.members[0]!,
					{ ...week.members[1]!, cells: WEEK_BEFORE.map(enteredOffCell) },
				],
			},
			1,
			vi.fn()
		);

		expect(screen.getByRole("note")).toHaveTextContent(
			"Carried over from the week of Nov 2. Days are added for 1 person who isn’t on that roster."
		);
		expect(
			screen.getByRole("button", { name: "Edit last week" })
		).toBeInTheDocument();
	});

	it("given_daysMissingOnAFirstRoster_when_shown_then_warnsWithBothCountsAndOffersLastWeek", async () => {
		const onAdd = vi.fn();
		show(firstWeek(), 0, onAdd);

		const note = screen.getByRole("note");
		expect(note).toHaveTextContent(
			"Last week is missing 12 days for 2 people."
		);
		expect(note).toHaveClass("bg-warning-50");
		await userEvent.click(
			screen.getByRole("button", { name: "Add last week" })
		);
		expect(onAdd).toHaveBeenCalledOnce();
	});

	it("given_oneDayMissingForOnePerson_when_shown_then_bothCountsAreSingular", () => {
		show(
			{
				...nothingAskedWeek(),
				members: [
					{
						...firstWeek().members[0]!,
						cells: [unknownCell("2026-11-08"), leaveCell("2026-11-07")],
					},
				],
			},
			0,
			vi.fn()
		);

		expect(screen.getByRole("note")).toHaveTextContent(
			"Last week is missing 1 day for 1 person."
		);
	});

	it("given_aNewJoinerMissingFromAPreviousRoster_when_shown_then_warnsInsteadOfCarriedOver", () => {
		show(carriedWeek(), 0, vi.fn());

		expect(screen.getByRole("note")).toHaveTextContent(
			"Last week is missing 7 days for 1 person."
		);
	});

	it("given_daysMissingAndADraftThePersonMayNotChange_when_shown_then_saysWhoCanAddThemAndNoButton", () => {
		show(firstWeek(), 0, undefined, true);

		expect(screen.getByRole("note")).toHaveTextContent(
			"Last week is missing 12 days for 2 people. Someone who can edit this schedule needs to add them."
		);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});
