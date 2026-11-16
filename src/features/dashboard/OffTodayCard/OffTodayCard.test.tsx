import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { dayOffFixture } from "@/features/dashboard/fixtures";
import { OffTodayCard } from "@/features/dashboard/OffTodayCard";
import { offByDay } from "@/features/dashboard/offToday";
import { leaveFixture } from "@/features/leave/fixtures";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const DAYS: [string, string] = ["2026-11-16", "2026-11-17"];
const ON_LEAVE_TODAY = leaveFixture({
	leaveRequestId: "leave-aisha",
	status: "APPROVED",
	startDate: "2026-11-16",
	endDate: "2026-11-16",
});

describe("OffTodayCard", () => {
	it("lists leave and rostered days off under their day", async () => {
		render(
			<MemoryRouterHarness>
				<OffTodayCard
					days={DAYS}
					daysOff={{ status: "ready", data: [dayOffFixture()] }}
					leave={{ status: "ready", data: [ON_LEAVE_TODAY] }}
				/>
			</MemoryRouterHarness>
		);

		expect(
			await screen.findByText("Aisha Rahman: Annual leave")
		).toBeInTheDocument();
		expect(screen.getByText("Kent Chua: Rest day")).toBeInTheDocument();
		expect(screen.queryByText("Nobody is off.")).toBeNull();
	});

	it("says so calmly for a day nobody is off", async () => {
		render(
			<MemoryRouterHarness>
				<OffTodayCard
					days={DAYS}
					daysOff={{ status: "ready", data: [] }}
					leave={{ status: "hidden" }}
				/>
			</MemoryRouterHarness>
		);

		expect(await screen.findAllByText("Nobody is off.")).toHaveLength(2);
	});

	it("lists someone on leave once, not again for a day off", () => {
		const groups = offByDay(
			DAYS,
			[ON_LEAVE_TODAY],
			[dayOffFixture({ day: "2026-11-16", membershipId: "m-aisha" })]
		);

		expect(groups[0]?.people.map((person) => person.kind)).toEqual(["leave"]);
	});
});
