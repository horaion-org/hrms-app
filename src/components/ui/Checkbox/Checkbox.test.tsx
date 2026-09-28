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
