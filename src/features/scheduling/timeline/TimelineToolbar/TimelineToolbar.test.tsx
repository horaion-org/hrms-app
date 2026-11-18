import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { twoTimelineSchedules } from "@/features/scheduling/timeline/fixtures";
import { TimelineToolbar } from "@/features/scheduling/timeline/TimelineToolbar";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

describe("TimelineToolbar", () => {
	it("steps, returns to today and changes the zoom", async () => {
		const onStep = vi.fn();
		const onToday = vi.fn();
		const onViewChange = vi.fn();
		render(
			<TimelineToolbar
				schedules={twoTimelineSchedules()}
				view="week"
				onScheduleChange={() => {}}
				onStep={onStep}
				onToday={onToday}
				onViewChange={onViewChange}
			/>
		);
		await userEvent.click(screen.getByRole("button", { name: "Earlier days" }));
		await userEvent.click(screen.getByRole("button", { name: "Later days" }));
		await userEvent.click(screen.getByRole("button", { name: "Today" }));
		await userEvent.click(screen.getByRole("button", { name: "4 weeks" }));
		expect(onStep.mock.calls).toEqual([[-1], [1]]);
		expect(onToday).toHaveBeenCalled();
		expect(onViewChange).toHaveBeenCalledWith("four");
		expect(screen.getByRole("button", { name: "Week" })).toHaveAttribute(
			"aria-pressed",
			"true"
		);
	});
});
