import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/assets/locales/en/translations.json";
import { beforeAll, describe, expect, it } from "vitest";
import { ReviewNotes } from "@/features/scheduling/ReviewNotes";
import { generationFindingsFixture } from "@/features/scheduling/schedules/fixtures";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

describe("ReviewNotes", () => {
	it("given_findings_when_rendered_then_quotesConflictsAndErrorsByMember", () => {
		render(<ReviewNotes findings={generationFindingsFixture()} />);

		const conflicts = screen.getByRole("region", { name: "Conflicts" });
		expect(conflicts).toHaveTextContent(
			"Sat, Oct 17, 09:00 – 15:00•1 person shortFront Desk AM is one Front Desk Staff short.Rule: Morning cover"
		);
		expect(
			within(conflicts).getByText(
				"Front Desk AM is one Front Desk Staff short."
			).tagName
		).toBe("Q");
		expect(
			screen.getByRole("region", { name: "Notes by member" })
		).toHaveTextContent("Ben Ong");
	});

	it("given_noConflicts_when_rendered_then_listsOnlyErrorsByMember", () => {
		render(
			<ReviewNotes findings={generationFindingsFixture({ conflicts: [] })} />
		);

		expect(screen.queryByRole("region", { name: "Conflicts" })).toBeNull();
		expect(
			screen.getByRole("region", { name: "Notes by member" })
		).toBeInTheDocument();
	});
});
