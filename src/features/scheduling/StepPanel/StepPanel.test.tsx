import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StepPanel } from "@/features/scheduling/StepPanel";

describe("StepPanel", () => {
	it("given_aTitle_when_rendered_then_namesTheSectionByIt", () => {
		render(
			<StepPanel description="Choose the shifts." title="Select Shifts">
				<p>Content</p>
			</StepPanel>
		);

		const panel = screen.getByRole("region", { name: "Select Shifts" });
		expect(panel).toHaveTextContent("Choose the shifts.");
		expect(panel).toHaveTextContent("Content");
	});

	it("given_actions_when_rendered_then_showsThemInThePanel", () => {
		render(
			<StepPanel
				actions={<button type="button">Add Constraint</button>}
				description="Define the constraints."
				title="Scheduling Constraints"
			/>
		);

		expect(
			screen.getByRole("button", { name: "Add Constraint" })
		).toBeInTheDocument();
	});
});
