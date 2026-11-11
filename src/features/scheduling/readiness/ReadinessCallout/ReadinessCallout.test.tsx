import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { authTestI18n } from "@/features/auth/testingI18n";
import { readinessFixture } from "@/features/scheduling/readiness/fixtures";
import {
	ReadinessCallout,
	type ReadinessCalloutProps,
} from "@/features/scheduling/readiness/ReadinessCallout";
import type { DepartmentChoice } from "@/features/workspace/unitChoices";

const KITCHEN: DepartmentChoice = {
	departmentId: "d-1",
	name: "Kitchen",
	branchId: "b-1",
	branchName: "Orchard",
	country: "SG",
	status: "ACTIVE",
};
const NOTHING = readinessFixture({
	ready: false,
	missing: ["SHIFT", "STAFFING_CONSTRAINT"],
});
const NO_STAFFING = readinessFixture({
	ready: false,
	missing: ["STAFFING_CONSTRAINT"],
});
const BAR = readinessFixture({
	departmentId: "d-2",
	departmentName: "Bar",
	ready: false,
	missing: ["STAFFING_CONSTRAINT"],
});

const show = (props: Partial<ReadinessCalloutProps>): void => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<MemoryRouterHarness>
				<ReadinessCallout
					rows={[]}
					view="shifts"
					onChooseDepartment={vi.fn()}
					{...props}
				/>
				<p>Rendered</p>
			</MemoryRouterHarness>
		</I18nextProvider>
	);
};

describe("ReadinessCallout", () => {
	it("given_everyDepartment_when_someAreNotReady_then_namesThemAndEachNarrowsTheTab", async () => {
		const user = userEvent.setup();
		const onChooseDepartment = vi.fn();
		show({ rows: [readinessFixture(), BAR], onChooseDepartment });

		const note = await screen.findByRole("note");
		expect(note).toHaveTextContent("1 department isn’t ready to schedule:");
		expect(note).toHaveClass("bg-warning-50");
		expect(within(note).queryByRole("button", { name: "Kitchen" })).toBeNull();
		await user.click(within(note).getByRole("button", { name: "Bar" }));
		expect(onChooseDepartment).toHaveBeenCalledWith("d-2");
	});

	it("given_oneDepartmentWithNothing_when_shown_then_listsTheChecklistWithShiftsFirst", async () => {
		show({ rows: [NOTHING], department: KITCHEN });

		const note = await screen.findByRole("note");
		expect(note).toHaveTextContent("Kitchen isn’t ready to schedule yet");
		const items = within(note).getAllByRole("listitem");
		expect(items[0]).toHaveTextContent("Add a shift");
		expect(items[0]).not.toHaveTextContent("Done");
		expect(items[1]).toHaveTextContent(
			"Add a staffing constraint: how many people each shift needs. Add a shift first."
		);
		expect(within(note).queryByRole("link")).toBeNull();
	});

	it("given_shiftsButNoStaffing_when_onTheShiftsTab_then_ticksTheShiftAndLinksToConstraints", async () => {
		show({ rows: [NO_STAFFING], department: KITCHEN });

		const note = await screen.findByRole("note");
		const items = within(note).getAllByRole("listitem");
		expect(items[0]).toHaveTextContent("Add a shiftDone");
		expect(
			within(note).getByRole("link", { name: "Go to Constraints" })
		).toHaveAttribute("href", "/scheduling?view=constraints");
	});

	it("given_shiftsButNoStaffing_when_onTheConstraintsTab_then_offersNoLink", async () => {
		show({ rows: [NO_STAFFING], department: KITCHEN, view: "constraints" });

		const note = await screen.findByRole("note");
		expect(note).toHaveTextContent("Add a staffing constraint");
		expect(within(note).queryByRole("link")).toBeNull();
	});

	it("given_aReadyDepartmentAndANewDraftWaiting_when_shown_then_offersToCreateTheSchedule", async () => {
		show({
			rows: [readinessFixture()],
			department: KITCHEN,
			returnTo: {
				to: "/scheduling/new",
				search: { department: "d-1", week: "2026-11-16" },
			},
		});

		const note = await screen.findByRole("note");
		expect(note).toHaveTextContent("Kitchen is ready to schedule.");
		expect(note).toHaveClass("bg-ink-blue-50");
		expect(
			within(note).getByRole("link", { name: "Create schedule" })
		).toHaveAttribute("href", "/scheduling/new?department=d-1&week=2026-11-16");
	});

	it("given_aReadyDepartmentAndASavedDraftWaiting_when_shown_then_offersTheWayBack", async () => {
		show({
			rows: [readinessFixture()],
			department: KITCHEN,
			returnTo: {
				to: "/scheduling/new",
				search: { step: "generate", scheduleId: "s-1", departmentId: "d-1" },
			},
		});

		expect(
			await screen.findByRole("link", { name: "Back to the schedule" })
		).toHaveAttribute(
			"href",
			"/scheduling/new?step=generate&scheduleId=s-1&departmentId=d-1"
		);
	});

	it("given_everythingReadyAndNoWayBack_when_shown_then_drawsNothing", async () => {
		show({ rows: [readinessFixture()], department: KITCHEN });
		await screen.findByText("Rendered");
		expect(screen.queryByRole("note")).toBeNull();

		show({ rows: [readinessFixture()] });
		expect(screen.queryByRole("note")).toBeNull();
	});
});
