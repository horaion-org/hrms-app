import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import { DaySwitcher } from "@/components/ui/DaySwitcher";

const WEEK = [
	"2026-11-09",
	"2026-11-10",
	"2026-11-11",
	"2026-11-12",
	"2026-11-13",
	"2026-11-14",
	"2026-11-15",
];

/** Ten days: more than seven, so the row scrolls. */
const TEN_DAYS = [...WEEK, "2026-11-16", "2026-11-17", "2026-11-18"];

const show = (
	day: string,
	days: Array<string> = WEEK
): ReturnType<typeof vi.fn> => {
	const onDayChange = vi.fn();
	render(
		<I18nextProvider i18n={authTestI18n}>
			<DaySwitcher day={day} days={days} onDayChange={onDayChange} />
		</I18nextProvider>
	);
	return onDayChange;
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe("DaySwitcher", () => {
	it("given_aDay_when_shown_then_pressesItsChipAndSaysItToScreenReadersOnly", () => {
		show("2026-11-11");

		expect(
			screen.getByRole("button", { name: "Wednesday, November 11" })
		).toHaveAttribute("aria-pressed", "true");
		expect(
			screen.getByRole("button", { name: "Thursday, November 12" })
		).toHaveAttribute("aria-pressed", "false");
		expect(screen.getByText("Wednesday, November 11")).toHaveClass("sr-only");
	});

	it("given_aWeek_when_shown_then_offersItsSevenDaysAcrossTheWidthWithNoArrows", () => {
		show("2026-11-11");

		expect(screen.getAllByRole("listitem")).toHaveLength(7);
		expect(screen.getByRole("list")).toHaveClass("grid", "grid-cols-7");
		expect(
			screen.queryByRole("button", { name: /Previous|Next/ })
		).not.toBeInTheDocument();
	});

	it("given_aDayButton_when_pressed_then_asksForThatDay", async () => {
		const user = userEvent.setup();
		const onDayChange = show("2026-11-11");

		await user.click(
			screen.getByRole("button", { name: "Saturday, November 14" })
		);

		expect(onDayChange).toHaveBeenCalledWith("2026-11-14");
	});

	it("given_moreThanSevenDays_when_shown_then_offersEveryDayInOneScrollingRowWithTheDayInView", () => {
		const scrollTo = vi.fn();
		vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(scrollTo);
		show("2026-11-17", TEN_DAYS);

		expect(screen.getAllByRole("listitem")).toHaveLength(10);
		expect(screen.getByRole("list")).toHaveClass("flex", "overflow-x-auto");
		expect(scrollTo).toHaveBeenCalledWith(
			expect.objectContaining({ behavior: "instant" })
		);
	});

	it("given_aWeek_when_shown_then_leavesTheRowWhereItIs", () => {
		const scrollTo = vi.fn();
		vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(scrollTo);
		show("2026-11-15");

		expect(scrollTo).not.toHaveBeenCalled();
	});

	it("given_theSwitcher_when_shown_then_isForNarrowScreensOnly", () => {
		show("2026-11-11");

		expect(screen.getByRole("group", { name: "Day" })).toHaveClass("md:hidden");
	});
});
