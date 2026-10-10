import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { FunctionComponent } from "@/common/types";
import { SwatchPicker } from "@/components/forms/SwatchPicker";

const options = [
	{ value: "#D4683F", label: "Terracotta" },
	{ value: "#E9A55A", label: "Orange" },
	{ value: "#8DB5EA", label: "Sky blue" },
];

const Picker = ({ initial }: { initial?: string }): FunctionComponent => {
	const [value, setValue] = useState(initial);
	return (
		<SwatchPicker
			aria-label="Shift colour"
			name="colour"
			options={options}
			value={value}
			onChange={setValue}
		/>
	);
};

describe("SwatchPicker", () => {
	it("given_colours_when_rendered_then_isARadioGroupNamingEachColour", () => {
		render(<Picker initial="#E9A55A" />);

		const group = screen.getByRole("radiogroup", { name: "Shift colour" });
		expect(group).toBeInTheDocument();
		expect(screen.getAllByRole("radio")).toHaveLength(3);
		expect(screen.getByRole("radio", { name: "Orange" })).toBeChecked();
		expect(screen.getByRole("radio", { name: "Terracotta" })).not.toBeChecked();
		expect(screen.getByRole("radio", { name: "Orange" })).toHaveStyle({
			backgroundColor: "#E9A55A",
		});
	});

	it("given_aSwatch_when_clicked_then_reportsItsColour", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<SwatchPicker
				aria-label="Shift colour"
				options={options}
				onChange={onChange}
			/>
		);

		await user.click(screen.getByRole("radio", { name: "Sky blue" }));

		expect(onChange).toHaveBeenCalledWith("#8DB5EA");
	});

	it("given_nothingChosen_when_tabbedTo_then_theFirstSwatchTakesFocusAndArrowsChoose", async () => {
		const user = userEvent.setup();
		render(<Picker />);

		await user.tab();
		expect(screen.getByRole("radio", { name: "Terracotta" })).toHaveFocus();

		await user.keyboard("{ArrowRight}");
		expect(screen.getByRole("radio", { name: "Orange" })).toHaveFocus();
		expect(screen.getByRole("radio", { name: "Orange" })).toBeChecked();

		await user.keyboard("{ArrowLeft}{ArrowLeft}");
		expect(screen.getByRole("radio", { name: "Sky blue" })).toBeChecked();
		expect(screen.getByRole("radio", { name: "Sky blue" })).toHaveFocus();
	});

	it("given_aChoice_when_rendered_then_onlyThatSwatchIsInTheTabOrderAndIsSubmitted", () => {
		const { container } = render(<Picker initial="#8DB5EA" />);

		expect(screen.getByRole("radio", { name: "Sky blue" })).toHaveAttribute(
			"tabindex",
			"0"
		);
		expect(screen.getByRole("radio", { name: "Orange" })).toHaveAttribute(
			"tabindex",
			"-1"
		);
		expect(container.querySelector("input[name=colour]")).toHaveValue(
			"#8DB5EA"
		);
	});

	it("given_disabled_when_rendered_then_noSwatchCanBeChosen", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<SwatchPicker
				disabled
				aria-label="Shift colour"
				options={options}
				onChange={onChange}
			/>
		);

		await user.click(screen.getByRole("radio", { name: "Orange" }));

		expect(onChange).not.toHaveBeenCalled();
		expect(screen.getByRole("radio", { name: "Orange" })).toBeDisabled();
	});
});
