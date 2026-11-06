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
	it("given_aGeneratedSchedule_when_rendered_then_showsItsDepartmentStatusAndZoneOnly", () => {
		render(
			<RosterHeader
				actions={<button type="button">Publish roster</button>}
				schedule={generatedScheduleFixture({ status: "GENERATED" })}
			/>
		);

		expect(
			screen.getByRole("heading", { level: 1, name: "Front Office Schedule" })
		).toBeInTheDocument();
		expect(screen.getByText("Generated")).toBeInTheDocument();
		expect(screen.getByText("Times in Asia/Singapore")).toBeInTheDocument();
		expect(screen.queryByText(/Requested by/)).toBeNull();
		expect(
			screen.getByRole("button", { name: "Publish roster" })
		).toBeInTheDocument();
	});
});
