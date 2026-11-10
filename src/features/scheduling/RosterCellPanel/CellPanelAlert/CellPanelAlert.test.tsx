import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CellPanelAlert } from "./CellPanelAlert";

describe("CellPanelAlert", () => {
	it("given_aFailure_when_rendered_then_announcesIt", () => {
		render(<CellPanelAlert>The roster changed. Reload it.</CellPanelAlert>);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"The roster changed. Reload it."
		);
	});
});
