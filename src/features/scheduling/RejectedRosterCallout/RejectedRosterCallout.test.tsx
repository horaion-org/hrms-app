import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { RejectedRosterCallout } from "@/features/scheduling/RejectedRosterCallout";
import { generatedScheduleFixture } from "@/features/scheduling/schedules/fixtures";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

describe("RejectedRosterCallout", () => {
	it("given_aRejectedRoster_when_rendered_then_saysWhoWhyAndWhatNext", () => {
		render(
			<RejectedRosterCallout
				showsNextStep
				schedule={generatedScheduleFixture({ status: "REJECTED" })}
			/>
		);

		const note = screen.getByRole("note");
		expect(note).toHaveTextContent(/^Rejected by José · /);
		expect(note).toHaveTextContent("Reason for rejection");
		expect(note).toHaveTextContent(
			"Regenerate the roster, or delete the schedule."
		);
	});

	it.each(["GENERATED", "PUBLISHED"] as const)(
		"given_a%sRoster_when_rendered_then_showsNothing",
		(status) => {
			const { container } = render(
				<RejectedRosterCallout
					schedule={generatedScheduleFixture({ status })}
				/>
			);

			expect(container).toBeEmptyDOMElement();
		}
	);
});
