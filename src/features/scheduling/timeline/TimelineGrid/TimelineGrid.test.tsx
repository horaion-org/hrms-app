import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import {
	FIXTURE_WEEK,
	timelineRowFixture,
	twoTimelineSchedules,
} from "@/features/scheduling/timeline/fixtures";
import type { TimelineView } from "@/features/scheduling/timeline/timeline";
import { TimelineGrid } from "@/features/scheduling/timeline/TimelineGrid";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

/** Renders Aisha's week in the given view, with `shownScheduleId` alone in full. */
const renderGrid = (
	view: TimelineView,
	shownScheduleId?: string
): HTMLElement => {
	render(
		<TimelineGrid
			days={FIXTURE_WEEK}
			rows={[timelineRowFixture()]}
			schedules={twoTimelineSchedules()}
			shownScheduleId={shownScheduleId}
			view={view}
		/>
	);
	return screen.getByRole("row", { name: /Aisha Rahman/ });
};

describe("TimelineGrid", () => {
	it("shows each schedule's shift and No schedule on a day in neither", () => {
		const row = renderGrid("week");
		expect(within(row).getAllByText(/Morning/)).toHaveLength(2);
		expect(within(row).getByText("No schedule")).toBeInTheDocument();
	});

	it("dims the cells of other schedules when one is shown alone", () => {
		const row = renderGrid("week", "s-late");
		const [early, late] = within(row).getAllByText(/Morning/);
		expect(early!.parentElement).toHaveClass("opacity-40");
		expect(late!.parentElement).not.toHaveClass("opacity-40");
	});

	it("shows a shift's initial in the four-week view", () => {
		const row = renderGrid("four");
		expect(within(row).getAllByText("M")).toHaveLength(2);
	});
});
