import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { FormRow, formRowIds } from "@/components/forms/FormRow";
import { Slider, type SliderProps } from "@/components/forms/Slider";

const Harness = (
	props: Omit<SliderProps, "value" | "onChange"> & {
		onChange?: (value: number) => void;
	}
): ReactElement => {
	const [value, setValue] = useState(8);
	return (
		<Slider
			aria-label="Proficiency"
			max={10}
			min={1}
			{...props}
			value={value}
			onChange={(next) => {
				setValue(next);
				props.onChange?.(next);
			}}
		/>
	);
};

describe("Slider", () => {
	it("is a named slider with its range, value and value text", () => {
		render(<Harness aria-valuetext="8 out of 10" />);

		const slider = screen.getByRole("slider", { name: "Proficiency" });
		expect(slider).toHaveValue("8");
		expect(slider).toHaveAttribute("min", "1");
		expect(slider).toHaveAttribute("max", "10");
		expect(slider).toHaveAttribute("step", "1");
		expect(slider).toHaveAttribute("aria-valuetext", "8 out of 10");
	});

	it("reports each change as a number and fills the track to it", () => {
		const onChange = vi.fn();
		render(<Harness onChange={onChange} />);
		const slider = screen.getByRole("slider");

		fireEvent.change(slider, { target: { value: "3" } });

		expect(onChange).toHaveBeenCalledWith(3);
		expect(slider).toHaveValue("3");
		// 3 is two ninths of the way from 1 to 10.
		expect(slider.style.getPropertyValue("--slider-fill")).toBe(
			`${(2 / 9) * 100}%`
		);
	});

	it("is reached by keyboard, and left alone when disabled", async () => {
		const user = userEvent.setup();
		render(
			<>
				<Harness />
				<Harness disabled aria-label="Locked" />
			</>
		);

		await user.tab();
		expect(screen.getByRole("slider", { name: "Proficiency" })).toHaveFocus();
		// Arrow keys are the browser's own; jsdom doesn't step a range input.
		await user.tab();
		expect(screen.getByRole("slider", { name: "Locked" })).toBeDisabled();
		expect(screen.getByRole("slider", { name: "Locked" })).not.toHaveFocus();
	});

	it("takes its name and description from a form row", () => {
		const id = "proficiency";
		render(
			<FormRow hint="From 1 to 10." htmlFor={id} label="Proficiency">
				<Slider
					aria-describedby={formRowIds(id).hintId}
					id={id}
					max={10}
					min={1}
					value={5}
					onChange={() => {}}
				/>
			</FormRow>
		);

		expect(
			screen.getByRole("slider", { name: "Proficiency" })
		).toHaveAccessibleDescription("From 1 to 10.");
	});
});
