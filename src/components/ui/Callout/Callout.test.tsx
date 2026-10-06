import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Callout } from "@/components/ui/Callout";

describe("Callout", () => {
	it("given_guidance_when_rendered_then_announcesItAsANote", () => {
		render(<Callout>Select a period that aligns with your business.</Callout>);

		expect(screen.getByRole("note")).toHaveTextContent(
			"Select a period that aligns with your business."
		);
	});

	it("given_aClassName_when_rendered_then_appliesItToTheNote", () => {
		render(<Callout className="mt-5">Guidance</Callout>);

		expect(screen.getByRole("note")).toHaveClass("mt-5", "flex");
	});
});
