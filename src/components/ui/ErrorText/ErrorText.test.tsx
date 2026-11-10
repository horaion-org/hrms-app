import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorText } from "@/components/ui/ErrorText";

describe("ErrorText", () => {
	it("given_aFailure_when_rendered_then_announcesIt", () => {
		render(<ErrorText>The roster changed. Reload it.</ErrorText>);

		expect(screen.getByRole("alert")).toHaveTextContent(
			"The roster changed. Reload it."
		);
	});

	it("given_noClassName_when_rendered_then_readsInTheErrorTone", () => {
		render(<ErrorText>Couldn't save.</ErrorText>);

		expect(screen.getByRole("alert")).toHaveClass("text-sm", "text-error-700");
	});

	it("given_aClassName_when_rendered_then_addsItToTheTone", () => {
		render(<ErrorText className="mt-6">Couldn't save.</ErrorText>);

		expect(screen.getByRole("alert")).toHaveClass(
			"mt-6",
			"text-sm",
			"text-error-700"
		);
	});
});
