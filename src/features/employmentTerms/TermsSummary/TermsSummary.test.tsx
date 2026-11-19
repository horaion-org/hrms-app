import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import "@/common/i18n";
import { sampleWeek } from "@/features/employmentTerms/sampleWeek";
import { TermsSummary } from "@/features/employmentTerms/TermsSummary";

const FIVE_DAYS = sampleWeek({
	daysPerWeek: 5,
	weekMinutes: 2640,
	dayMinutes: 528,
	restDay: "SUN",
	partTime: false,
});

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

	it("given_completeTerms_when_shown_then_theSampleWeekItsExampleAndWhatThisChanges", () => {
		render(
			<TermsSummary
				effects={["Hours: overtime is counted from the week above."]}
				example="Example: 48 h worked in a week is 44 h normal and 4 h overtime."
				readBack={{ complete: true, text: "Full-time, 5 days a week, 44 h." }}
				sampleWeek={FIVE_DAYS}
			/>
		);
		expect(
			screen.getByRole("heading", { name: "A sample week" })
		).toBeVisible();
		expect(screen.getByRole("list", { name: "A sample week" })).toBeVisible();
		expect(
			screen.getByText(
				"Example: 48 h worked in a week is 44 h normal and 4 h overtime."
			)
		).toBeVisible();
		expect(
			screen.getByRole("heading", { name: "What this changes" })
		).toBeVisible();
		expect(
			screen.getByText("Hours: overtime is counted from the week above.")
		).toBeVisible();
	});

	it("given_unfinishedTerms_when_shown_then_noSampleWeek", () => {
		render(
			<TermsSummary
				effects={["Hours: overtime is counted from the week above."]}
				readBack={{ complete: false, text: "Not finished yet." }}
				sampleWeek={FIVE_DAYS}
			/>
		);
		expect(screen.queryByRole("heading", { name: "A sample week" })).toBeNull();
		expect(
			screen.queryByRole("heading", { name: "What this changes" })
		).toBeNull();
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
