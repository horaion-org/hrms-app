import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { DayCoverMarks } from "@/features/scheduling/months/DayCoverMarks";
import { coverDays } from "@/features/scheduling/months/fixtures";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("DayCoverMarks", () => {
	it("given_aCoveredWeekWithOneShortDay_when_rendered_then_readsEachDay", () => {
		render(<DayCoverMarks days={coverDays("2026-11-16", { 1: 1 })} />);

		expect(
			screen.getByRole("img", {
				name: "Monday covered, Tuesday 1 shift short, Wednesday covered, Thursday covered, Friday covered, Saturday covered, Sunday covered",
			})
		).toBeInTheDocument();
	});

	it("given_twoShortShiftsOnADay_when_rendered_then_saysShiftsInThePlural", () => {
		render(<DayCoverMarks days={coverDays("2026-11-16", { 4: 2 })} />);

		expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
			"Friday 2 shifts short"
		);
	});

	it("given_noRoster_when_rendered_then_sevenWeekdaysWithNoRoster", () => {
		render(<DayCoverMarks days={[]} />);

		expect(screen.getByRole("img").getAttribute("aria-label")).toBe(
			"Monday no roster, Tuesday no roster, Wednesday no roster, Thursday no roster, Friday no roster, Saturday no roster, Sunday no roster"
		);
		expect(screen.getByRole("img")).toHaveTextContent("MTWTFSS");
	});
});
