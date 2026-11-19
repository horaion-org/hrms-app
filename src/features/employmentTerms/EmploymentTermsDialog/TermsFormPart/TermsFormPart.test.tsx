import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TermsFormPart } from "./TermsFormPart";

describe("TermsFormPart", () => {
	it("given_aTitle_when_rendered_then_thePartIsARegionNamedByItsHeading", () => {
		render(
			<TermsFormPart title="Working week">
				<p>Fields</p>
			</TermsFormPart>
		);
		const part = screen.getByRole("region", { name: "Working week" });
		expect(part).toHaveTextContent("Fields");
		expect(
			screen.getByRole("heading", { level: 3, name: "Working week" })
		).toBeInTheDocument();
	});
});
