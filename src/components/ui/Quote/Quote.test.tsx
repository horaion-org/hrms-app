import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import * as stories from "@/components/ui/Quote/Quote.stories";

const { Default, SeveralLines } = composeStories(stories);

describe("Quote", () => {
	it("given_aCaptionAndWords_when_rendered_then_quotesTheWordsUnderTheCaption", () => {
		render(<Default />);

		const figure = screen.getByRole("figure");
		expect(figure.querySelector("figcaption")).toHaveTextContent(
			"Reason for rejection"
		);
		expect(figure).toHaveTextContent(
			"Too many night shifts for the kitchen team."
		);
		expect(
			screen.getByText("Too many night shifts for the kitchen team.").tagName
		).toBe("BLOCKQUOTE");
	});

	it("given_wordsWithLineBreaks_when_rendered_then_keepsTheBreaksAsText", () => {
		render(<SeveralLines />);

		const quote = screen.getByText(/No roster satisfies/);
		expect(quote).toHaveClass("whitespace-pre-line");
		expect(quote.textContent).toContain("\n");
	});
});
