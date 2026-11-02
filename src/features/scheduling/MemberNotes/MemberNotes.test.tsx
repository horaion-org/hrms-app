import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/assets/locales/en/translations.json";
import { beforeAll, describe, expect, it } from "vitest";
import { MemberNotes } from "@/features/scheduling/MemberNotes";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({
			lng: "en",
			resources: { en: { translation: en } },
			interpolation: { escapeValue: false },
		});
});

describe("MemberNotes", () => {
	it("given_groups_when_rendered_then_namesEachAndQuotesItsMessages", () => {
		render(
			<MemberNotes
				groups={[
					{
						memberProfileId: "mp-2",
						name: "Ben Ong",
						entries: [
							{ date: "2026-10-17", messages: ["Ben is short of rest."] },
						],
					},
					{
						memberProfileId: "mp-9",
						name: null,
						entries: [{ date: null, messages: ["Unknown member."] }],
					},
					{
						memberProfileId: null,
						name: null,
						entries: [{ date: null, messages: ["Saturday is short."] }],
					},
				]}
			/>
		);

		const notes = screen.getByRole("region", { name: "Notes by member" });
		expect(notes).toHaveTextContent(
			"Ben OngSat, Oct 17Ben is short of rest.mp-9Unknown member.Whole rosterSaturday is short."
		);
		expect(within(notes).getByText("Ben is short of rest.").tagName).toBe("Q");
	});
});
