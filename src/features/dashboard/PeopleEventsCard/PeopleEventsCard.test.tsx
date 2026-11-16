import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { peopleEventFixture } from "@/features/dashboard/fixtures";
import { PeopleEventsCard } from "@/features/dashboard/PeopleEventsCard";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("PeopleEventsCard", () => {
	it("names each person's event, its day and department", () => {
		render(
			<PeopleEventsCard
				events={{
					status: "ready",
					data: [
						peopleEventFixture(),
						peopleEventFixture({
							kind: "LEAVES",
							membershipId: "ms-kent",
							displayName: null,
						}),
					],
				}}
			/>
		);

		expect(
			screen.getByText("Aisha Rahman's probation ends")
		).toBeInTheDocument();
		expect(screen.getByText("A former member leaves")).toBeInTheDocument();
		expect(screen.getAllByText(/ · Sales$/)).toHaveLength(2);
	});

	it("says so calmly when nobody joins or leaves", () => {
		render(<PeopleEventsCard events={{ status: "ready", data: [] }} />);

		expect(
			screen.getByText(
				"Nobody joins, ends probation or leaves in the next 30 days."
			)
		).toBeInTheDocument();
	});
});
