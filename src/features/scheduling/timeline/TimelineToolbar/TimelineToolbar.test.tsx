import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
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
				firstDay="2027-02-08"
				view="week"
				onFromChange={() => {}}
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
		const zoom = screen.getByRole("group", { name: "Zoom" });
		expect(
			within(zoom)
				.getAllByRole("button")
				.map((option) => option.getAttribute("aria-pressed"))
		).toEqual(["true", "false", "false"]);
	});

	/** "Go to date" opens the window on the Monday of the picked day's week. */
	it("goes to the week of a picked date", async () => {
		const onFromChange = vi.fn();
		render(
			<TimelineToolbar
				firstDay="2026-12-14"
				view="two"
				onFromChange={onFromChange}
				onStep={() => {}}
				onToday={() => {}}
				onViewChange={() => {}}
			/>
		);
		await userEvent.click(
			screen.getByRole("button", { name: /^Go to date: / })
		);
		await userEvent.click(
			screen.getByRole("gridcell", { name: /\b9 December 2026/ })
		);
		expect(onFromChange).toHaveBeenCalledExactlyOnceWith("2026-12-07");
	});
});
