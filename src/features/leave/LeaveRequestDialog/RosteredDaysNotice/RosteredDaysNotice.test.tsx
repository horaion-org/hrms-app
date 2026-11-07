import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RosteredDaysNotice } from "./RosteredDaysNotice";

const days = [{ day: "2026-06-03", minutes: 480 }];

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
});
