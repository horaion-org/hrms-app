import { render, screen, within } from "@testing-library/react";
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

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

describe("ScheduleBars", () => {
	/** Two schedules that don't overlap share one lane, each named with its state. */
	it("shows each schedule as a bar with its name and state", async () => {
		render(
			<MemoryRouterHarness>
				<ScheduleBars
					days={FIXTURE_WEEK}
					schedules={twoTimelineSchedules()}
					onShowOnly={() => {}}
				/>
			</MemoryRouterHarness>
		);
		const bars = await screen.findByRole("group", { name: "Schedules" });
		expect(within(bars).getByText("Early week")).toBeInTheDocument();
		expect(within(bars).getByText("Weekend")).toBeInTheDocument();
		expect(within(bars).getByText("To review")).toBeInTheDocument();
		expect(bars.children).toHaveLength(1);
	});
});
