import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { shortageFixture } from "@/features/dashboard/fixtures";
import { ShortShiftsCard } from "@/features/dashboard/ShortShiftsCard";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("ShortShiftsCard", () => {
	it("links each short shift to its roster with Find cover open on that day", async () => {
		render(
			<MemoryRouterHarness>
				<ShortShiftsCard
					shortages={{
						status: "ready",
						data: [shortageFixture({ shortBy: 2 })],
					}}
				/>
			</MemoryRouterHarness>
		);

		const link = await screen.findByRole("link", { name: /Morning/ });
		expect(link).toHaveAttribute(
			"href",
			"/scheduling/s-1?week=2026-11-16&day=2026-11-18&cover=fs-am%7C2026-11-18"
		);
		expect(screen.getByText("Sales · short by 2 people")).toBeInTheDocument();
	});

	it("says so calmly when every shift is staffed", async () => {
		render(
			<MemoryRouterHarness>
				<ShortShiftsCard shortages={{ status: "ready", data: [] }} />
			</MemoryRouterHarness>
		);

		expect(
			await screen.findByText("Every shift is staffed this week and next.")
		).toBeInTheDocument();
	});

	it("is left out where rosters may not be read", () => {
		const { container } = render(
			<MemoryRouterHarness>
				<ShortShiftsCard shortages={{ status: "hidden" }} />
			</MemoryRouterHarness>
		);

		expect(container).toBeEmptyDOMElement();
	});
});
