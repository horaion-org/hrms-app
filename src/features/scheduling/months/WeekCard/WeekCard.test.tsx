import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import type { MonthWeek } from "@/features/scheduling/months/api";
import {
	coverDays,
	monthWeekFixture,
} from "@/features/scheduling/months/fixtures";
import { WeekCard } from "@/features/scheduling/months/WeekCard";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const noRoster = { days: [], handChangedDays: null };

const renderCard = async (week: MonthWeek): Promise<HTMLElement> => {
	render(
		<MemoryRouterHarness>
			<WeekCard departmentId="d-1" week={week} />
		</MemoryRouterHarness>
	);
	return screen.findByRole("region");
};

describe("WeekCard", () => {
	it("given_theWeekUnderReview_when_rendered_then_reviewOpensItsRoster", async () => {
		const card = await renderCard(
			monthWeekFixture({ state: "TO_REVIEW", scheduleId: "s-2" })
		);

		expect(within(card).getByText("To review")).toBeInTheDocument();
		expect(within(card).getByRole("link", { name: /^Review/ })).toHaveAttribute(
			"href",
			"/scheduling/s-2"
		);
	});

	it("given_aDraft_when_rendered_then_openGoesToItsSetup", async () => {
		const card = await renderCard(
			monthWeekFixture({ state: "DRAFT", scheduleId: "s-5", ...noRoster })
		);

		expect(within(card).getByRole("link", { name: /^Open/ })).toHaveAttribute(
			"href",
			"/scheduling/new?step=setup&scheduleId=s-5&departmentId=d-1"
		);
	});

	it("given_aRejectedWeek_when_rendered_then_openGoesToItsRoster", async () => {
		const card = await renderCard(
			monthWeekFixture({ state: "REJECTED", scheduleId: "s-6", ...noRoster })
		);

		expect(within(card).getByText("Rejected")).toBeInTheDocument();
		expect(within(card).getByRole("link", { name: /^Open/ })).toHaveAttribute(
			"href",
			"/scheduling/s-6"
		);
	});

	it("given_aWeekNotGeneratedYet_when_rendered_then_noAction", async () => {
		const card = await renderCard(
			monthWeekFixture({
				state: "NOT_GENERATED",
				scheduleId: null,
				...noRoster,
			})
		);

		expect(within(card).getByText("Not generated")).toBeInTheDocument();
		expect(within(card).queryByRole("link")).not.toBeInTheDocument();
	});

	it("given_shortDays_when_rendered_then_countsTheWeeksShortShiftsInThePlural", async () => {
		const card = await renderCard(
			monthWeekFixture({ days: coverDays("2026-11-02", { 1: 1, 4: 2 }) })
		);

		expect(card).toHaveTextContent("3 shifts short");
	});

	it("given_everyShiftCovered_when_rendered_then_saysSoAndNoHandChangeLine", async () => {
		const card = await renderCard(monthWeekFixture({ handChangedDays: 0 }));

		expect(card).toHaveTextContent("Every shift covered");
		expect(card).not.toHaveTextContent("changed by hand");
	});

	it("given_oneDayChangedByHand_when_rendered_then_saysSo", async () => {
		const card = await renderCard(monthWeekFixture({ handChangedDays: 1 }));

		expect(card).toHaveTextContent("1 day changed by hand");
	});
});
