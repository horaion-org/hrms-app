import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RateField } from "./RateField";

const LABEL = "An overtime hour is paid at";
const UNIT = "times a normal hour";

/** A registration stand-in: the field's name and inert handlers. */
const registration = {
	name: "overtimeTimes",
	onChange: vi.fn(),
	onBlur: vi.fn(),
	ref: vi.fn(),
};

describe("RateField", () => {
	it("given_aRate_when_rendered_then_itsNameIsTheWholeSentence", () => {
		render(
			<RateField
				id="rate"
				label={LABEL}
				registration={registration}
				unit={UNIT}
			/>
		);
		expect(
			screen.getByRole("textbox", { name: `${LABEL} ${UNIT}` })
		).toBeVisible();
		expect(screen.getByText(UNIT)).toBeVisible();
	});

	it("given_aHint_when_rendered_then_theFigureIsDescribedByIt", () => {
		render(
			<RateField
				hint="The legal minimum is 1.5."
				id="rate"
				label={LABEL}
				registration={registration}
				unit={UNIT}
			/>
		);
		expect(screen.getByRole("textbox")).toHaveAccessibleDescription(
			"The legal minimum is 1.5."
		);
		expect(screen.getByRole("textbox")).toHaveAttribute(
			"aria-invalid",
			"false"
		);
	});

	it("given_anError_when_rendered_then_theFigureIsInvalidAndDescribedByTheError", () => {
		render(
			<RateField
				error="Enter 1.5 or more."
				hint="The legal minimum is 1.5."
				id="rate"
				label={LABEL}
				registration={registration}
				unit={UNIT}
			/>
		);
		const figure = screen.getByRole("textbox");
		expect(figure).toHaveAttribute("aria-invalid", "true");
		expect(figure).toHaveAccessibleDescription("Enter 1.5 or more.");
	});
});
