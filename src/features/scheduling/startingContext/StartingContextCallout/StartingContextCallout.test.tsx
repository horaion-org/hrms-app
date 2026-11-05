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

const show = (
	week: StartingDays,
	enteredCount: number,
	onAdd?: () => void
): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<StartingContextCallout
				enteredCount={enteredCount}
				week={week}
				onAdd={onAdd}
			/>
		</I18nextProvider>
	);
};

describe("StartingContextCallout", () => {
	it("given_noPreviousRoster_when_shown_then_saysEveryoneStartsRestedAndOffersLastWeek", async () => {
		const onAdd = vi.fn();
		show(firstWeek(), 0, onAdd);

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
		show(firstWeek(), 1, vi.fn());

		expect(screen.getByRole("note")).toHaveTextContent(
			"No roster before this week. Days are added for 1 person; everyone else starts rested."
		);
		expect(
			screen.getByRole("button", { name: "Edit last week" })
		).toBeInTheDocument();
	});

	it("given_aPreviousRosterMissingANewJoiner_when_shown_then_carriedOverWithTheNewJoinerNamed", () => {
		show(carriedWeek(), 0, vi.fn());

		expect(screen.getByRole("note")).toHaveTextContent(
			"Carried over from the week of Nov 2. 1 person isn’t on that roster and starts rested."
		);
	});

	it("given_aDraftThePersonMayNotChange_when_shown_then_noButton", () => {
		show(firstWeek(), 0);

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});
