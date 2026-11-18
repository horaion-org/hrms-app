import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import {
	FIXTURE_WEEK,
	twoTimelineSchedules,
} from "@/features/scheduling/timeline/fixtures";
import { ScheduleBars } from "@/features/scheduling/timeline/ScheduleBars";
import type { TimelineSchedule } from "@/features/scheduling/timeline/timeline";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

/** Renders the bar lanes of `schedules` over the fixture week, in a table as the grid holds them. */
const renderBars = (schedules: Array<TimelineSchedule>): void => {
	render(
		<MemoryRouterHarness>
			<table>
				<tbody>
					<ScheduleBars
						days={FIXTURE_WEEK}
						schedules={schedules}
						onShowOnly={() => {}}
					/>
				</tbody>
			</table>
		</MemoryRouterHarness>
	);
};

describe("ScheduleBars", () => {
	/** Two schedules that don't overlap share one lane; each bar's cell spans its own three day columns. */
	it("spans each bar over exactly its days, in one lane", async () => {
		renderBars(twoTimelineSchedules());
		const label = await screen.findByRole("rowheader", { name: "Schedules" });
		const lane = label.closest("tr")!;
		expect(screen.getAllByRole("row")).toHaveLength(1);
		const cells = within(lane).getAllByRole("cell");
		expect(cells.map((cell) => cell.getAttribute("colspan"))).toEqual([
			"3",
			"1",
			"3",
		]);
		expect(within(cells[0]!).getByText("Early week")).toBeInTheDocument();
		expect(within(cells[2]!).getByText("Weekend")).toBeInTheDocument();
		expect(within(cells[2]!).getByText("To review")).toBeInTheDocument();
	});

	/** A schedule not ready yet wears the month page's words for its state. */
	it.each([
		["GENERATING", "Generating"],
		["FAILED", "Generation failed"],
		["REJECTED", "Rejected"],
		["NOT_GENERATED", "Not generated"],
	] as const)("shows a %s schedule as %s", async (status, words) => {
		const [early] = twoTimelineSchedules();
		renderBars([{ ...early!, status }]);
		expect(await screen.findByText(words)).toBeInTheDocument();
	});

	/** A failed schedule's bar still opens its page, where the failure is explained. */
	it("keeps Open schedule on a failed schedule's menu", async () => {
		const [early] = twoTimelineSchedules();
		renderBars([{ ...early!, status: "FAILED" }]);
		await userEvent.click(
			await screen.findByRole("button", {
				name: /Early week, Generation failed/,
			})
		);
		expect(
			await screen.findByRole("menuitem", { name: "Open schedule" })
		).toBeInTheDocument();
	});
});
