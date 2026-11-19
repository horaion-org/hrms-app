import { render, screen, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { sampleWeek } from "@/features/employmentTerms/sampleWeek";
import { SampleWeek } from "@/features/employmentTerms/SampleWeek";

const draw = (week: ReturnType<typeof sampleWeek>): Array<string> => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<SampleWeek week={week} />
		</I18nextProvider>
	);
	return within(screen.getByRole("list", { name: "A sample week" }))
		.getAllByRole("listitem")
		.map((day) => day.textContent ?? "");
};

describe("SampleWeek", () => {
	it("given_5DaysSundayRest_when_drawn_then_fiveNormalOneOffOneRest", () => {
		expect(
			draw(
				sampleWeek({
					daysPerWeek: 5,
					weekMinutes: 2640,
					dayMinutes: 528,
					restDay: "SUN",
					partTime: false,
				})
			)
		).toEqual([
			"8 h 48 minMonMonday",
			"8 h 48 minTueTuesday",
			"8 h 48 minWedWednesday",
			"8 h 48 minThuThursday",
			"8 h 48 minFriFriday",
			"offSatSaturday",
			"restSunSunday",
		]);
	});

	it("given_rosterPicks_when_drawn_then_restMarkedAsAnExample", () => {
		const days = draw(
			sampleWeek({
				daysPerWeek: 6,
				weekMinutes: 2640,
				dayMinutes: 440,
				restDay: "ROSTERED",
				partTime: false,
			})
		);
		expect(days[days.length - 1]).toBe("rest*SunSunday");
	});

	it("given_daysVary_when_drawn_then_everyDayVaries", () => {
		const days = draw(
			sampleWeek({
				daysPerWeek: null,
				weekMinutes: 1200,
				dayMinutes: null,
				restDay: "ROSTERED",
				partTime: true,
			})
		);
		expect(days.every((day) => day.startsWith("varies"))).toBe(true);
	});
});
