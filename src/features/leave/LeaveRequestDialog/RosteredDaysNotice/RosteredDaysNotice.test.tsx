import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RosteredDaysNotice } from "./RosteredDaysNotice";

const days = [{ day: "2026-06-03", minutes: 480 }];
const shortened = [
	{
		day: "2026-06-03",
		minutes: 480,
		shiftStart: "07:00",
		shiftEnd: "15:00",
		outcome: "SHORTENED" as const,
		workedTimes: [{ start: "11:00", end: "15:00" }],
		gap: { start: "07:00", end: "11:00" },
	},
];

describe("RosteredDaysNotice", () => {
	it("given_noRosteredDay_when_rendered_then_showsNothing", () => {
		const { container } = render(<RosteredDaysNotice days={[]} />);
		expect(container).toBeEmptyDOMElement();
	});

	it("given_theApplicantsOwnDays_when_rendered_then_tellsThemAndAsksNothing", () => {
		render(<RosteredDaysNotice days={days} />);
		expect(screen.getByText("leave.rosteredOwn")).toBeInTheDocument();
		expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
	});

	it("given_aReviewer_when_ticked_then_reportsTheConfirmation", async () => {
		const onConfirmedChange = vi.fn();
		render(
			<RosteredDaysNotice
				confirmed={false}
				days={days}
				name="Alex Tan"
				onConfirmedChange={onConfirmedChange}
			/>
		);
		await userEvent.click(screen.getByRole("checkbox"));
		expect(onConfirmedChange).toHaveBeenCalledWith(true);
	});

	it("given_theDaysCouldNotBeRead_when_retried_then_asksAgainAndOffersNoConfirmation", async () => {
		const onRetry = vi.fn();
		render(<RosteredDaysNotice days={[]} onRetry={onRetry} />);
		expect(screen.getByText(/leave\.rosteredCheckFailed/)).toBeInTheDocument();
		expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
		await userEvent.click(screen.getByRole("button"));
		expect(onRetry).toHaveBeenCalledOnce();
	});

	it("given_partDayLeaveKeepingPartOfTheApplicantsShift_when_rendered_then_saysWhatTheyWillWork", () => {
		render(<RosteredDaysNotice days={shortened} />);
		expect(screen.getByText("leave.partDayOwn")).toBeInTheDocument();
	});

	it("given_partDayLeaveForAReviewer_when_rendered_then_asksToShortenTheShift", () => {
		render(
			<RosteredDaysNotice confirmed={false} days={shortened} name="Alex Tan" />
		);
		expect(screen.getByText("leave.partDayOther")).toBeInTheDocument();
		expect(
			screen.getByRole("checkbox", { name: "leave.partDayConfirm" })
		).toBeInTheDocument();
	});

	it("given_partDayLeaveCoveringTheShift_when_rendered_then_todaysWords", () => {
		render(
			<RosteredDaysNotice
				name="Alex Tan"
				days={[
					{
						...shortened[0]!,
						outcome: "TAKEN_OFF",
						gap: null,
						workedTimes: [],
					},
				]}
			/>
		);
		expect(screen.getByText("leave.rosteredOther")).toBeInTheDocument();
	});
});
