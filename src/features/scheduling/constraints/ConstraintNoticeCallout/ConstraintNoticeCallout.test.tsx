import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConstraintNoticeCallout } from "@/features/scheduling/constraints/ConstraintNoticeCallout";

const DUTY_COVER = { constraintId: "c-1", name: "Duty cover" };
const LATE_COVER = { constraintId: "c-2", name: "Late cover" };

describe("ConstraintNoticeCallout", () => {
	it("given_twoConstraints_when_oneIsChosen_then_itsRowIsShown", async () => {
		const onShow = vi.fn();
		render(
			<ConstraintNoticeCallout
				constraints={[DUTY_COVER, LATE_COVER]}
				lead="2 rules leave shifts short:"
				tone="warning"
				onShow={onShow}
			/>
		);

		expect(screen.getByRole("note")).toHaveTextContent(
			"2 rules leave shifts short: Duty cover · Late cover"
		);
		await userEvent.click(screen.getByRole("button", { name: "Late cover" }));
		expect(onShow).toHaveBeenCalledWith(LATE_COVER);
	});

	it("given_noConstraintsButAFootnote_when_shown_then_onlyTheFootnote", () => {
		render(
			<ConstraintNoticeCallout
				constraints={[]}
				footnote="1 more needs attention outside this filter."
				lead="0 rules:"
				tone="error"
				onShow={vi.fn()}
			/>
		);

		expect(screen.getByRole("note")).toHaveTextContent(
			/^1 more needs attention outside this filter\.$/
		);
	});
});
