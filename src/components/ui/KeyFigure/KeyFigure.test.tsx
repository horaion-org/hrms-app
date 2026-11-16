import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KeyFigure } from "@/components/ui/KeyFigure";

describe("KeyFigure", () => {
	it("given_aFigure_when_rendered_then_namesItWithItsUnitAndStatus", () => {
		render(
			<KeyFigure
				label="People short"
				status={{ tone: "error", label: "Act" }}
				unit="next 14 days"
				value="21"
			/>
		);

		const figure = screen.getByRole("region", { name: "People short" });
		expect(figure).toHaveTextContent("21");
		expect(figure).toHaveTextContent("next 14 days");
		expect(within(figure).getByText("Act")).toHaveClass("bg-error-100");
	});

	it("given_aChange_when_rendered_then_saysTheMoveInWordsBesideTheComparison", () => {
		render(
			<KeyFigure
				change={{ direction: "up", amount: "6", description: "Up 6" }}
				comparison="on the 14 days before"
				label="People short"
				value="21"
			/>
		);

		expect(screen.getByText("Up 6")).toHaveClass("sr-only");
		expect(screen.getByText("on the 14 days before")).toBeInTheDocument();
	});

	it("given_noComparison_when_rendered_then_showsTheFigureAlone", () => {
		render(<KeyFigure label="Next week published" value="5" />);

		expect(
			screen.getByRole("region", { name: "Next week published" })
		).toHaveTextContent(/^Next week published5$/);
	});

	it("given_aChart_when_rendered_then_placesItUnderTheFigure", () => {
		render(
			<KeyFigure label="Next week published" value="5">
				<div data-testid="chart" />
			</KeyFigure>
		);

		expect(screen.getByTestId("chart")).toBeInTheDocument();
	});
});
