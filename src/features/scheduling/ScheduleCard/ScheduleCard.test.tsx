import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { ScheduleCard } from "@/features/scheduling/ScheduleCard";
import type { ScheduleRecord } from "@/features/scheduling/schedules";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const schedule: ScheduleRecord = {
	scheduleId: "fo-260413",
	code: "FO-260413",
	departmentName: "Front Office",
	period: { start: "2026-04-13", end: "2026-04-26" },
	status: "PENDING",
	createdAt: "2026-04-07T09:30:00.000Z",
	coverage: 92.4,
	openShifts: 5,
	conflicts: 1,
};

describe("ScheduleCard", () => {
	it("given_aSchedule_when_rendered_then_showsItsPeriodStatusAndCoverage", async () => {
		render(
			<MemoryRouterHarness>
				<ScheduleCard schedule={schedule} />
			</MemoryRouterHarness>
		);

		const card = await screen.findByRole("region", { name: "FO-260413" });
		expect(within(card).getByText("Pending")).toBeInTheDocument();
		expect(within(card).getByText("92.4%")).toBeInTheDocument();
		expect(
			within(card).getByRole("progressbar", { name: "Coverage" })
		).toHaveAttribute("aria-valuenow", "92.4");
		expect(card).toHaveTextContent("5 Open Shifts");
		expect(card).toHaveTextContent("1 Conflict");
		expect(
			within(card).getByRole("link", { name: "View schedule FO-260413" })
		).toHaveAttribute("href", "/scheduling/fo-260413");
	});

	it("given_aProcessingSchedule_when_rendered_then_isBusyWithPlaceholders", async () => {
		render(
			<MemoryRouterHarness>
				<ScheduleCard
					schedule={{
						...schedule,
						status: "PROCESSING",
						coverage: undefined,
					}}
				/>
			</MemoryRouterHarness>
		);

		const card = await screen.findByRole("region", { name: "FO-260413" });
		expect(card).toHaveAttribute("aria-busy", "true");
		expect(within(card).getByText("Generating schedule")).toBeInTheDocument();
		expect(within(card).queryByRole("progressbar")).toBeNull();
	});
});
