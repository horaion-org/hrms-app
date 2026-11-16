import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import "@/common/i18n";
import { TermsSummary } from "@/features/employmentTerms/TermsSummary";

describe("TermsSummary", () => {
	it("reads the terms back under its heading, announced politely", () => {
		render(
			<TermsSummary
				readBack={{ complete: true, text: "Works 44 hours a week." }}
			/>
		);
		expect(
			screen.getByRole("heading", { name: "These terms in words" })
		).toBeVisible();
		const sentence = screen.getByText("Works 44 hours a week.");
		expect(sentence).toHaveClass("text-neutral-900");
		expect(sentence.closest("section")).toHaveAttribute("aria-live", "polite");
	});

	it("shows what is unfinished in a quieter tone", () => {
		render(
			<TermsSummary
				readBack={{
					complete: false,
					text: "Not finished yet: fill in or check the normal hours a week.",
				}}
			/>
		);
		expect(
			screen.getByText(
				"Not finished yet: fill in or check the normal hours a week."
			)
		).toHaveClass("text-neutral-700");
	});
});
