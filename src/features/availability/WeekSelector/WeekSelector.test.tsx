import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { formatWeekStart } from "@/features/availability/availabilityModel";
import { WeekSelector } from "@/features/availability/WeekSelector";

const WEDNESDAY = new Date("2026-11-04T12:00:00");
const weekOf = (monday: string): string =>
	`Week of ${formatWeekStart(monday, "en")}`;

const show = (
	value: string,
	onChange = vi.fn(),
	today = WEDNESDAY
): {
	onChange: ReturnType<typeof vi.fn>;
	rerender: (nextToday: Date) => void;
} => {
	const tree = (day: Date): ReactElement => (
		<I18nextProvider i18n={authTestI18n}>
			<WeekSelector today={day} value={value} onChange={onChange} />
		</I18nextProvider>
	);
	const { rerender } = render(tree(today));
	return {
		onChange,
		rerender: (nextToday): void => {
			rerender(tree(nextToday));
		},
	};
};

const optionTexts = (): Array<string | null> =>
	screen.getAllByRole("option").map((option) => option.textContent);

describe("WeekSelector", () => {
	it("given_today_when_opened_then_offersSixWeeksThisOneFirst", async () => {
		const user = userEvent.setup();
		show("2026-11-02");

		const trigger = screen.getByRole("button", { name: "Week" });
		expect(trigger).toHaveTextContent(weekOf("2026-11-02"));
		await user.click(trigger);

		expect(optionTexts()).toEqual([
			weekOf("2026-11-02"),
			weekOf("2026-11-09"),
			weekOf("2026-11-16"),
			weekOf("2026-11-23"),
			weekOf("2026-11-30"),
			weekOf("2026-12-07"),
		]);
	});

	it("given_aWeekPicked_when_chosen_then_reportsItsMonday", async () => {
		const user = userEvent.setup();
		const { onChange } = show("2026-11-02");

		await user.click(screen.getByRole("button", { name: "Week" }));
		await user.click(
			screen.getByRole("option", { name: weekOf("2026-11-16") })
		);

		expect(onChange).toHaveBeenCalledWith("2026-11-16");
	});

	it("given_aWeekOutsideTheSix_when_opened_then_offersItInDateOrder", async () => {
		const user = userEvent.setup();
		show("2026-10-26");

		await user.click(screen.getByRole("button", { name: "Week" }));

		expect(optionTexts()[0]).toBe(weekOf("2026-10-26"));
		expect(optionTexts()).toHaveLength(7);
	});

	it("given_aNewToday_when_rendered_then_countsTheWeeksFromIt", async () => {
		const user = userEvent.setup();
		const { rerender } = show("2026-11-09");

		rerender(new Date("2026-11-10T08:00:00"));
		await user.click(screen.getByRole("button", { name: "Week" }));

		expect(optionTexts()[0]).toBe(weekOf("2026-11-09"));
		expect(optionTexts()).not.toContain(weekOf("2026-11-02"));
	});
});
