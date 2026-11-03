import { render, screen, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	AvailabilityCard,
	type AvailabilityCardProps,
} from "@/features/people/availability/AvailabilityCard";

const show = (props: AvailabilityCardProps): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<AvailabilityCard {...props} />
		</I18nextProvider>
	);
};

/** The windows listed under one day of the strip. */
const dayOf = (name: string): HTMLElement => {
	const term = screen.getByText(name, { selector: "dt" });
	return term.nextElementSibling as HTMLElement;
};

describe("AvailabilityCard", () => {
	it("given_windows_when_shown_then_listsEachDaysWindowsOnePerLineMondayFirst", () => {
		show({
			windows: [
				{ day: "MON", startTime: "17:00", endTime: "21:00" },
				{ day: "MON", startTime: "09:00", endTime: "13:00" },
			],
		});

		expect(
			screen.getByRole("heading", { level: 2, name: "Availability" })
		).toBeVisible();
		expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual(
			[
				"Monday",
				"Tuesday",
				"Wednesday",
				"Thursday",
				"Friday",
				"Saturday",
				"Sunday",
			]
		);
		expect(
			[...dayOf("Monday").children].map((line) => line.textContent)
		).toEqual(["09:00–13:00", "17:00–21:00"]);
	});

	it("given_aDayWithoutWindows_when_shown_then_showsADash", () => {
		show({ windows: [{ day: "MON", startTime: "09:00", endTime: "13:00" }] });

		expect(within(dayOf("Tuesday")).getByText("—")).toBeVisible();
		expect(within(dayOf("Tuesday")).getByText("Not available")).toHaveClass(
			"sr-only"
		);
	});

	it("given_anOvernightWindow_when_shown_then_showsJustItsTimes", () => {
		show({ windows: [{ day: "FRI", startTime: "22:00", endTime: "06:00" }] });

		expect(dayOf("Friday")).toHaveTextContent("22:00–06:00");
	});

	it("given_noWindowsAndAnEmptyMessage_when_shown_then_saysItInsteadOfTheWeek", () => {
		show({ windows: [], emptyMessage: "Add the hours this person can work." });

		expect(
			screen.getByText("Add the hours this person can work.")
		).toBeVisible();
		expect(screen.queryByRole("term")).not.toBeInTheDocument();
	});

	it("given_aFailedLoad_when_shown_then_saysSo", () => {
		show({ windows: undefined, failed: true });

		expect(screen.getByRole("alert")).toHaveTextContent(
			"We couldn’t load the availability. Try again."
		);
	});
});
