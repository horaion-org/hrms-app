import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { FunctionComponent } from "@/common/types";
import { RadioCard } from "@/components/forms/RadioCard";

const Modes = (): FunctionComponent => {
	const [mode, setMode] = useState("shift");
	return (
		<div aria-label="Demand" role="radiogroup">
			<RadioCard
				checked={mode === "shift"}
				description="Set required staff for each shift."
				label="By Shift"
				name="mode"
				value="shift"
				onChange={setMode}
			/>
			<RadioCard
				checked={mode === "blocks"}
				label="Detailed Time Blocks"
				name="mode"
				value="blocks"
				onChange={setMode}
			/>
		</div>
	);
};

describe("RadioCard", () => {
	it("given_aCard_when_rendered_then_isARadioNamedAndDescribed", () => {
		render(<Modes />);

		const shift = screen.getByRole("radio", { name: "By Shift" });
		expect(shift).toBeChecked();
		expect(shift).toHaveAccessibleDescription(
			"Set required staff for each shift."
		);
	});

	it("given_anotherCard_when_clicked_then_reportsItsValue", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<RadioCard
				checked={false}
				label="Detailed Time Blocks"
				name="mode"
				value="blocks"
				onChange={onChange}
			/>
		);

		await user.click(screen.getByText("Detailed Time Blocks"));

		expect(onChange).toHaveBeenCalledWith("blocks");
	});

	it("given_aGroup_when_arrowKeyPressed_then_movesTheChoice", async () => {
		const user = userEvent.setup();
		render(<Modes />);

		await user.click(screen.getByRole("radio", { name: "By Shift" }));
		await user.keyboard("{ArrowRight}");

		expect(
			screen.getByRole("radio", { name: "Detailed Time Blocks" })
		).toBeChecked();
	});

	it("given_disabled_when_clicked_then_doesNotReport", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<RadioCard
				disabled
				checked={false}
				label="By Shift"
				name="mode"
				value="shift"
				onChange={onChange}
			/>
		);

		await user.click(screen.getByText("By Shift"));

		expect(onChange).not.toHaveBeenCalled();
		expect(screen.getByRole("radio", { name: "By Shift" })).toBeDisabled();
	});

	it("given_theLargeSize_when_rendered_then_headsWithTheLabelAt16AndDescribesInFullBelow", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<div aria-label="Kind" role="radiogroup">
				<RadioCard
					checked={false}
					description="How many people a shift needs, by job title."
					label="People on a shift"
					name="kind"
					size="large"
					value="SHIFT_STAFFING"
					onChange={onChange}
				/>
			</div>
		);

		const radio = screen.getByRole("radio", { name: "People on a shift" });
		expect(radio).toHaveAccessibleDescription(
			"How many people a shift needs, by job title."
		);
		expect(screen.getByText("People on a shift")).toHaveClass("text-base");
		expect(
			screen.getByText("How many people a shift needs, by job title.")
		).toHaveClass("text-xs");
		await user.click(screen.getByText("People on a shift"));
		expect(onChange).toHaveBeenCalledWith("SHIFT_STAFFING");
	});
});
