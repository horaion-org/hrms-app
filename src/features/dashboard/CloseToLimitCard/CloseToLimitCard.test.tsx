import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { CloseToLimitCard } from "@/features/dashboard/CloseToLimitCard";
import { peopleNearLimit } from "@/features/dashboard/closeToLimit";
import { overtimeFixture } from "@/features/dashboard/fixtures";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const renderCard = (overtime: ReturnType<typeof overtimeFixture>): void => {
	render(
		<MemoryRouterHarness>
			<CloseToLimitCard overtime={{ status: "ready", data: overtime }} />
		</MemoryRouterHarness>
	);
};

describe("CloseToLimitCard", () => {
	it("names each person near or over the limit with their hours", async () => {
		renderCard(overtimeFixture());

		expect(await screen.findByText("Aisha Rahman")).toBeInTheDocument();
		expect(screen.getByText("Over")).toBeInTheDocument();
		expect(
			screen.getByText("74 h of 72 h overtime · Sales")
		).toBeInTheDocument();
		expect(
			screen.getByText("At 80% of the monthly overtime limit or more.")
		).toBeInTheDocument();
	});

	it("says when the company sets no monthly limit", async () => {
		const overtime = overtimeFixture();
		renderCard({
			...overtime,
			departments: overtime.departments.map((department) => ({
				...department,
				ceilingMinutes: null,
				members: [],
			})),
		});

		expect(
			await screen.findByText("No monthly overtime limit is set.")
		).toBeInTheDocument();
	});

	it("says so calmly when nobody is close", async () => {
		renderCard(overtimeFixture({ departments: [] }));

		expect(
			await screen.findByText("Nobody is close to the limit this month.")
		).toBeInTheDocument();
	});

	it("puts the most overtime first across departments", () => {
		const overtime = overtimeFixture();
		const [sales] = overtime.departments;
		if (!sales) throw new Error("The fixture has a department");
		const people = peopleNearLimit({
			...overtime,
			departments: [
				sales,
				{
					...sales,
					departmentId: "d-2",
					departmentName: "Bar",
					members: [
						{
							membershipId: "ms-wei",
							displayName: "Wei Jun",
							overtimeMinutes: 90 * 60,
							standing: "OVER",
						},
					],
				},
			],
		});

		expect(people.map((person) => person.displayName)).toEqual([
			"Wei Jun",
			"Aisha Rahman",
		]);
	});
});
