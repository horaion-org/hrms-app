import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import "@/common/i18n";
import { FIVE_DAY_WEEK, REFERENCE } from "@/features/employmentTerms/fixtures";
import { termsFormValuesOf } from "@/features/employmentTerms/termsForm";
import { TermsMeaningSection } from "./TermsMeaningSection";

describe("TermsMeaningSection", () => {
	it("given_completeTerms_when_rendered_then_readsThemBackWithASampleWeekUnderItsHeading", () => {
		render(
			<TermsMeaningSection
				partTime={false}
				reference={REFERENCE}
				values={termsFormValuesOf(FIVE_DAY_WEEK)}
			/>
		);
		const part = screen.getByRole("region", {
			name: "What these terms mean",
		});
		expect(part).toHaveTextContent(
			"Full-time, 5 days a week, 44 h (8 h 48 min a day)."
		);
		expect(
			within(part).getByRole("heading", { name: "A sample week" })
		).toBeVisible();
	});
});
