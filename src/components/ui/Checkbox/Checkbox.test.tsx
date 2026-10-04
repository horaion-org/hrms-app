import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Checkbox } from "@/components/ui/Checkbox";

describe("Checkbox", () => {
	it("given_aCheckbox_when_rendered_then_theLabelNamesTheBox", () => {
		render(<Checkbox label="Remember me" />);

		expect(
			screen.getByRole("checkbox", { name: "Remember me" })
		).toBeInTheDocument();
	});

	it("given_unchecked_when_clicked_then_reportsTheChange", async () => {
		const user = userEvent.setup();
		let seen = false;
		render(
			<Checkbox
				label="Remember me"
				onChange={(event) => {
					seen = event.target.checked;
				}}
			/>
		);

		await user.click(screen.getByRole("checkbox", { name: "Remember me" }));

		expect(seen).toBe(true);
	});

	it("given_checked_when_rendered_then_showsChecked", () => {
		render(<Checkbox checked readOnly label="Remember me" />);

		expect(screen.getByRole("checkbox", { name: "Remember me" })).toBeChecked();
	});
});

describe("Checkbox labelling and mixed state", () => {
	it("given_hideLabel_when_rendered_then_keepsTheNameButHidesTheText", () => {
		render(<Checkbox hideLabel label="Select Orchard" />);

		expect(
			screen.getByRole("checkbox", { name: "Select Orchard" })
		).toBeInTheDocument();
		expect(screen.getByText("Select Orchard")).toHaveClass("sr-only");
	});

	it("given_indeterminate_when_rendered_then_reportsTheMixedState", () => {
		const { rerender } = render(
			<Checkbox indeterminate readOnly label="Select all" />
		);

		const box = screen.getByRole("checkbox", { name: "Select all" });
		expect(box).toBePartiallyChecked();

		rerender(<Checkbox readOnly label="Select all" />);
		expect(box).not.toBePartiallyChecked();
	});

	it("given_aClassName_when_rendered_then_appliesItToTheWrapper", () => {
		render(<Checkbox className="justify-center" label="Remember me" />);

		expect(
			screen.getByRole("checkbox", { name: "Remember me" }).parentElement
		).toHaveClass("flex", "justify-center");
	});
});
