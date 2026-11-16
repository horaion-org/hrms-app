import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import type { NextRosterRow } from "@/features/dashboard/nextRoster";
import { NextRosterCard } from "@/features/dashboard/NextRosterCard";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const COMING_MONDAY = "2026-11-23";

/** Sales' coming week in a state, with its step. */
const row = (overrides: Partial<NextRosterRow>): NextRosterRow => ({
	branchId: "b-1",
	departmentId: "d-1",
	departmentName: "Sales",
	state: "NOT_GENERATED",
	scheduleId: null,
	step: "generate",
	missing: [],
	...overrides,
});

const renderCard = (rows: Array<NextRosterRow>): void => {
	render(
		<MemoryRouterHarness>
			<NextRosterCard
				comingMonday={COMING_MONDAY}
				rows={{ status: "ready", data: rows }}
			/>
		</MemoryRouterHarness>
	);
};

describe("NextRosterCard", () => {
	it("leads a week not generated to its month", async () => {
		renderCard([row({})]);

		expect(
			await screen.findByRole("link", { name: "Generate: Sales" })
		).toHaveAttribute("href", "/scheduling/months/2026-11?department=d-1");
	});

	it("leads a week to review to its roster", async () => {
		renderCard([
			row({ state: "TO_REVIEW", scheduleId: "s-1", step: "review" }),
		]);

		expect(
			await screen.findByRole("link", { name: "Review and publish: Sales" })
		).toHaveAttribute("href", "/scheduling/s-1");
		expect(screen.getByText("To review")).toBeInTheDocument();
	});

	it("names what blocks a Department and leads to its set-up", async () => {
		renderCard([
			row({ step: "setUp", missing: ["SHIFT", "STAFFING_CONSTRAINT"] }),
		]);

		expect(
			await screen.findByText("No shift · No staffing rule")
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Set up: Sales" }).getAttribute("href")
		).toContain("view=shifts");
	});

	it("stops at five Departments and offers the rest", async () => {
		renderCard(
			Array.from({ length: 7 }, (_, index) =>
				row({ departmentId: `d-${index}`, departmentName: `Unit ${index}` })
			)
		);

		expect(await screen.findAllByRole("listitem")).toHaveLength(5);
		expect(
			screen.getByRole("button", { name: "Show all 7" })
		).toBeInTheDocument();
	});
});
