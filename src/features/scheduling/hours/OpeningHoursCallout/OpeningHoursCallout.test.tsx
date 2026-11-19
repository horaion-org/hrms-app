import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	OpeningHoursCallout,
	type OpeningHoursState,
} from "@/features/scheduling/hours/OpeningHoursCallout";

const show = (
	hours: OpeningHoursState,
	handlers: { onAdd?: () => void; onRetry?: () => void } = {}
): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<OpeningHoursCallout asOf="2026-11-09" hours={hours} {...handlers} />
		</I18nextProvider>
	);
};

describe("OpeningHoursCallout", () => {
	it("given_unknownHours_when_shown_then_warnsHowManyAndWhyAndOffersToAddThem", async () => {
		const onAdd = vi.fn();
		show({ kind: "read", unknownCount: 30 }, { onAdd });

		const note = screen.getByRole("note");
		expect(note).toHaveClass("bg-warning-50");
		expect(note).toHaveTextContent(
			"Hours worked before Nov 9 are unknown for 30 people." +
				"Without them, monthly overtime limits count from Nov 9 instead of the 1st." +
				"Add them"
		);
		await userEvent.click(screen.getByRole("button", { name: "Add them" }));
		expect(onAdd).toHaveBeenCalled();
	});

	it("given_noDraftYet_when_shown_then_saysTheHoursAreNotKnownAndOffersToAddThem", () => {
		show({ kind: "notRead", carried: false }, { onAdd: vi.fn() });

		expect(
			screen.getByText(
				"Horaion doesn’t know the hours people worked this month before Nov 9."
			)
		).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Add hours worked" })
		).toBeVisible();
	});

	it("given_noDraftYetAndTheWeekBeforeRostered_when_shown_then_aCalmLineStillOffersToAddThem", () => {
		show({ kind: "notRead", carried: true }, { onAdd: vi.fn() });

		expect(screen.getByRole("note")).not.toHaveClass("bg-warning-50");
		expect(
			screen.getByText(
				"Hours worked before Nov 9 come from the roster of the week before, except for anyone it doesn’t cover."
			)
		).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Add hours worked" })
		).toBeVisible();
	});

	it("given_everyoneKnown_when_shown_then_aCalmLineWithALinkToEdit", () => {
		show({ kind: "read", unknownCount: 0 }, { onAdd: vi.fn() });

		expect(screen.getByRole("note")).not.toHaveClass("bg-warning-50");
		expect(
			screen.getByText("Hours worked before Nov 9 are known for everyone.")
		).toBeVisible();
		expect(
			screen.getByRole("button", { name: "Edit hours worked" })
		).toBeVisible();
	});

	it("given_aWeekStartingOnThe1st_when_shown_then_saysNothingCarriesOver", () => {
		show({ kind: "notNeeded" });

		expect(
			screen.getByText(
				"This week starts on the 1st, so no hours or overtime carry over from earlier in the month."
			)
		).toBeVisible();
	});

	it("given_aFailedRead_when_retried_then_itAsksAgain", async () => {
		const onRetry = vi.fn();
		show({ kind: "failed" }, { onRetry });

		expect(
			screen.getByText("The hours worked earlier this month couldn’t be read.")
		).toBeVisible();
		await userEvent.click(screen.getByRole("button", { name: "Try again" }));
		expect(onRetry).toHaveBeenCalled();
	});

	it("given_noWayToChangeThem_when_shown_then_noButton", () => {
		show({ kind: "read", unknownCount: 3 });

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});
