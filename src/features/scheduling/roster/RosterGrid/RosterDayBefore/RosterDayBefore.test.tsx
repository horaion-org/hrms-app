import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { RosterDayBefore } from "@/features/scheduling/roster/RosterGrid/RosterDayBefore";
import type { DayBeforeRun } from "@/features/scheduling/startingContext/daysBeforeRun";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const dayOf = (
	what: DayBeforeRun["what"],
	enteredByHand: boolean
): DayBeforeRun => ({
	memberProfileId: "mp-1",
	date: "2026-10-13",
	what,
	enteredByHand,
});

const NIGHT = {
	kind: "shift",
	name: "Night",
	start: "22:00",
	end: "06:00",
} as const;

describe("RosterDayBefore", () => {
	it.each([
		[
			"an entered shift",
			dayOf(NIGHT, true),
			["22:00", "Night", "Entered"],
			"Aisha Rahman, Tuesday, 13 October: Night 22:00 – 06:00 – entered by hand, not rostered",
		],
		[
			"an entered rest day",
			dayOf({ kind: "off", dayType: "REST" }, true),
			["Rest day", "Entered"],
			"Aisha Rahman, Tuesday, 13 October: Rest day – entered by hand, not rostered",
		],
		[
			"a rostered shift",
			dayOf(NIGHT, false),
			["22:00", "Night"],
			"Aisha Rahman, Tuesday, 13 October: Night 22:00 – 06:00 – from a roster",
		],
		[
			"a rostered day off",
			dayOf({ kind: "off", dayType: null }, false),
			["OFF"],
			"Aisha Rahman, Tuesday, 13 October: Day off – from a roster",
		],
		[
			"leave",
			dayOf({ kind: "leave" }, false),
			["LEAVE"],
			"Aisha Rahman, Tuesday, 13 October: on leave",
		],
		[
			"a day not known",
			undefined,
			[],
			"Aisha Rahman, Tuesday, 13 October: not known",
		],
	] satisfies Array<[string, DayBeforeRun | undefined, Array<string>, string]>)(
		"shows %s, read-only",
		(_name, day, words, label) => {
			const { container } = render(
				<RosterDayBefore
					day={day}
					dayName="Tuesday, 13 October"
					name="Aisha Rahman"
				/>
			);

			const tile = screen.getByTitle(label);
			for (const word of words) expect(tile).toHaveTextContent(word);
			if (!day?.enteredByHand) expect(tile).not.toHaveTextContent("Entered");
			expect(screen.getByText(label)).toHaveClass("sr-only");
			expect(screen.queryByRole("button")).toBeNull();
			expect(container.querySelector("[tabindex]")).toBeNull();
		}
	);

	it("draws an entered day dotted and a rostered day plain", () => {
		render(
			<>
				<RosterDayBefore day={dayOf(NIGHT, true)} dayName="Tue" name="A" />
				<RosterDayBefore day={dayOf(NIGHT, false)} dayName="Wed" name="B" />
			</>
		);

		expect(screen.getByTitle(/A, Tue/)).toHaveClass("border-dotted");
		expect(screen.getByTitle(/B, Wed/)).not.toHaveClass("border-dotted");
	});
});
