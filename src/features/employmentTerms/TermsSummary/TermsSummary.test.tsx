import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
	it("keeps to one line on a phone until Show all opens it", async () => {
		const user = userEvent.setup();
		render(
			<TermsSummary
				readBack={{ complete: true, text: "Works 44 hours a week." }}
			/>
		);
		const sentence = screen.getByText("Works 44 hours a week.");
		expect(sentence).toHaveClass("max-sm:line-clamp-1");
		await user.click(screen.getByRole("button", { name: "Show all" }));
		expect(sentence).not.toHaveClass("max-sm:line-clamp-1");
		expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute(
			"aria-expanded",
			"true"
		);
	});
});
