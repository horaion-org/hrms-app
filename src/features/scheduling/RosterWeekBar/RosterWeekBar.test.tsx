import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { RosterWeekBar } from "@/features/scheduling/RosterWeekBar";
import { weeksOf } from "@/features/scheduling/schedules";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const weeks = weeksOf({ start: "2026-04-13", end: "2026-04-26" });

describe("RosterWeekBar", () => {
	it("given_theFirstWeek_when_rendered_then_onlyNextIsOffered", async () => {
		const user = userEvent.setup();
		const onWeekChange = vi.fn();
		render(
			<RosterWeekBar
				legend={[]}
				week="2026-04-13"
				weeks={weeks}
				onToday={vi.fn()}
				onWeekChange={onWeekChange}
			/>
		);

		expect(
			screen.getByRole("button", { name: "Previous week" })
		).toBeDisabled();
		await user.click(screen.getByRole("button", { name: "Next week" }));
		expect(onWeekChange).toHaveBeenCalledWith("2026-04-20");
	});

	it("given_today_when_clicked_then_asksForTodaysWeek", async () => {
		const user = userEvent.setup();
		const onToday = vi.fn();
		render(
			<RosterWeekBar
				legend={[]}
				week="2026-04-20"
				weeks={weeks}
				onToday={onToday}
				onWeekChange={vi.fn()}
			/>
		);

		expect(screen.getByRole("button", { name: "Next week" })).toBeDisabled();
		await user.click(screen.getByRole("button", { name: "Today" }));
		expect(onToday).toHaveBeenCalled();
	});

	it("given_aGeneratedLegend_when_rendered_then_keepsItBehindTheLegendButton", () => {
		render(
			<RosterWeekBar
				legend={[{ kind: "off" }, { kind: "leave" }]}
				week="2026-04-13"
				weeks={weeks}
				onToday={vi.fn()}
				onWeekChange={vi.fn()}
			/>
		);

		expect(screen.getByRole("button", { name: "Legend" })).toHaveAttribute(
			"aria-expanded",
			"false"
		);
		expect(screen.queryByRole("list", { name: "Legend" })).toBeNull();
	});

	it("given_noLegend_when_rendered_then_offersNoLegendButton", () => {
		render(
			<RosterWeekBar
				legend={[]}
				week="2026-04-13"
				weeks={weeks}
				onToday={vi.fn()}
				onWeekChange={vi.fn()}
			/>
		);

		expect(screen.queryByRole("button", { name: "Legend" })).toBeNull();
	});

	it("given_theLegendButton_when_chosen_then_namesOffLeaveAndEachShiftInItsColour", async () => {
		const user = userEvent.setup();
		render(
			<RosterWeekBar
				week="2026-04-13"
				weeks={weeks}
				legend={[
					{ kind: "off" },
					{ kind: "leave" },
					{
						kind: "shift",
						shiftId: "front-desk-am-copy",
						name: "Front Desk AM",
						colour: "#E9A55A",
					},
				]}
				onToday={vi.fn()}
				onWeekChange={vi.fn()}
			/>
		);

		await user.click(screen.getByRole("button", { name: "Legend" }));

		const legend = await screen.findByRole("list", { name: "Legend" });
		expect(legend).toHaveTextContent("Day OffOn LeaveFront Desk AM");
		const [, leave, shift] = within(legend).getAllByRole("listitem");
		expect(leave!.firstElementChild).toHaveClass("bg-ink-blue-50");
		expect(shift!.firstElementChild).toHaveStyle({
			backgroundColor: "#E9A55A",
		});
	});
});
