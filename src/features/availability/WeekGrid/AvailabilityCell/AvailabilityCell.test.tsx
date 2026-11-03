import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { TimeWindow } from "@/features/availability/availabilityModel";
import { AvailabilityCell } from "@/features/availability/WeekGrid/AvailabilityCell";

const show = (windows: Array<TimeWindow>): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<AvailabilityCell windows={windows} />
		</I18nextProvider>
	);
};

describe("AvailabilityCell", () => {
	it("given_twoWindows_when_shown_then_listsAChipForEachInOrder", () => {
		show([
			{ startTime: "09:00", endTime: "13:00" },
			{ startTime: "18:00", endTime: "22:00" },
		]);

		expect(
			screen.getAllByRole("listitem").map((item) => item.textContent)
		).toEqual(["09:00–13:00", "18:00–22:00"]);
	});

	it("given_noWindows_when_shown_then_readsAsNotAvailable", () => {
		show([]);

		expect(screen.getByText("Not available")).toHaveClass("sr-only");
		expect(screen.queryByRole("list")).not.toBeInTheDocument();
	});
});
