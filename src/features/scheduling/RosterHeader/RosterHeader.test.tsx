import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/assets/locales/en/translations.json";
import { beforeAll, describe, expect, it } from "vitest";
import { RosterHeader } from "@/features/scheduling/RosterHeader";
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

describe("RosterHeader", () => {
	it("given_aGeneratedSchedule_when_rendered_then_showsItsDepartmentStatusZoneAndRun", () => {
		render(
			<RosterHeader
				actions={<button type="button">View setup</button>}
				schedule={generatedScheduleFixture({ status: "GENERATED" })}
			/>
		);

		expect(
			screen.getByRole("heading", { level: 1, name: "Front Office Schedule" })
		).toBeInTheDocument();
		expect(screen.getByText("Generated")).toBeInTheDocument();
		expect(screen.getByText("Times in Asia/Singapore")).toBeInTheDocument();
		expect(
			screen.getByText(/Requested by José on Oct 9, 2026, 6:00/)
		).toHaveTextContent(/Finished on Oct 9, 2026, 6:02/);
		expect(
			screen.getByRole("button", { name: "View setup" })
		).toBeInTheDocument();
	});

	it("given_aRequesterWhoIsGone_when_rendered_then_namesThemAFormerMember", () => {
		render(
			<RosterHeader
				schedule={generatedScheduleFixture({
					generationRequestedBy: { membershipId: "m-x", displayName: null },
				})}
			/>
		);

		expect(screen.getByText(/Requested by Former member/)).toBeInTheDocument();
		expect(screen.queryByText(/Finished on/)).toBeNull();
	});
});
