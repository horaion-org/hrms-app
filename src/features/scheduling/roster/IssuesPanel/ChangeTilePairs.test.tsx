import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { ChangeTileGroup } from "@/features/scheduling/roster/changeTiles";
import { ChangeTilePairs } from "./ChangeTilePairs";

/** One person's day: Day off → Front Desk AM 09:00 – 15:00, stretched by `stretchMinutes`. */
const group = (
	membershipId: string,
	name: string,
	day: string,
	stretchMinutes = 0
): ChangeTileGroup => ({
	membershipId,
	name,
	days: [
		{
			key: `${membershipId}|${day}`,
			day,
			before: { kind: "day", label: "Day off" },
			after: {
				kind: "shift",
				name: "Front Desk AM",
				colour: "#E9A55A",
				times: { start: "09:00", end: "15:00" },
				stretchMinutes,
			},
		},
	],
});

const show = (groups: Array<ChangeTileGroup>): HTMLElement =>
	render(
		<I18nextProvider i18n={authTestI18n}>
			<ChangeTilePairs groups={groups} />
		</I18nextProvider>
	).container;

describe("ChangeTilePairs", () => {
	it("given_onePerson_when_drawn_then_eachDayWithItsDateAndNoNameAndTheArrowReadAsBecomes", () => {
		const drawn = show([group("m-1", "Aisha Rahman", "2026-10-17")]);

		expect(drawn).toHaveTextContent(
			"Sat, Oct 17Day off→becomesFront Desk AM 09:00 – 15:00"
		);
		expect(screen.queryByText("Aisha Rahman")).toBeNull();
		expect(screen.getByText("becomes")).toHaveClass("sr-only");
	});

	it("given_twoPeople_when_drawn_then_eachPersonsDaysUnderTheirNameWithAStretchsMark", () => {
		const drawn = show([
			group("m-2", "Ben Ong", "2026-10-17", 120),
			group("m-3", "Chen Wei", "2026-10-16"),
		]);

		expect(drawn).toHaveTextContent(
			/Ben Ong.*Sat, Oct 17.*\+2 h.*Chen Wei.*Fri, Oct 16/
		);
	});
});
