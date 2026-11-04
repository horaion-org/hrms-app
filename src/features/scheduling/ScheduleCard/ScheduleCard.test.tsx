import { render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { ScheduleCard } from "@/features/scheduling/ScheduleCard";
import {
	emptyFindingsFixture,
	generatedScheduleFixture,
	generationFixture,
	scheduleFixture,
} from "@/features/scheduling/schedules/fixtures";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

describe("ScheduleCard", () => {
	it("given_aDraft_when_rendered_then_showsWhereItIsFiledAndReopensItsSetup", async () => {
		render(
			<MemoryRouterHarness>
				<ScheduleCard schedule={scheduleFixture()} />
			</MemoryRouterHarness>
		);

		const card = await screen.findByRole("region", {
			name: "Front Office - Week 42",
		});
		expect(card).toHaveTextContent("Main branch › Front Office");
		expect(within(card).getByText("Draft")).toBeInTheDocument();
		expect(
			within(card).getByRole("link", {
				name: "View schedule Front Office - Week 42",
			})
		).toHaveAttribute(
			"href",
			"/scheduling/new?step=setup&scheduleId=s-1&departmentId=d-1"
		);
	});

	it("given_aGeneratedSchedule_when_rendered_then_opensItsRoster", async () => {
		render(
			<MemoryRouterHarness>
				<ScheduleCard
					schedule={generatedScheduleFixture({ status: "GENERATED" })}
				/>
			</MemoryRouterHarness>
		);

		const card = await screen.findByRole("region", {
			name: "Front Office - Week 42",
		});
		expect(within(card).getByText("Generated")).toBeInTheDocument();
		expect(within(card).getByText("1 setup issue")).toBeInTheDocument();
		expect(within(card).getByRole("link")).toHaveAttribute(
			"href",
			"/scheduling/s-1?branchId=b-1&departmentId=d-1"
		);
	});

	it("given_aRunWithoutSetupIssues_when_rendered_then_showsNoSetupBadge", async () => {
		render(
			<MemoryRouterHarness>
				<ScheduleCard
					schedule={generatedScheduleFixture({
						status: "GENERATED",
						generation: generationFixture({ findings: emptyFindingsFixture() }),
					})}
				/>
			</MemoryRouterHarness>
		);

		const card = await screen.findByRole("region", {
			name: "Front Office - Week 42",
		});
		expect(within(card).queryByText(/setup issue/)).toBeNull();
	});
});
