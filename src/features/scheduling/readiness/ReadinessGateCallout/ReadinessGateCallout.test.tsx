import { render, screen, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { MemoryRouterHarness } from "@/components/utils/MemoryRouterHarness";
import { authTestI18n } from "@/features/auth/testingI18n";
import { readinessFixture } from "@/features/scheduling/readiness/fixtures";
import {
	fixLinkOf,
	gateOf,
	type Gate,
} from "@/features/scheduling/readiness/readinessCopy";
import {
	ReadinessGateCallout,
	type FixLink,
} from "@/features/scheduling/readiness/ReadinessGateCallout";

const KITCHEN = { branchId: "b-1", departmentId: "d-1" };
const NOTHING = readinessFixture({
	ready: false,
	missing: ["SHIFT", "STAFFING_CONSTRAINT"],
});
const NO_STAFFING = readinessFixture({
	ready: false,
	missing: ["STAFFING_CONSTRAINT"],
});
const BOTH = { shifts: true, constraints: true };
const NEITHER = { shifts: false, constraints: false };

const linkTo = (gate: Gate): FixLink => ({
	to: "/scheduling",
	search: fixLinkOf(gate.linkTo ?? "shifts", KITCHEN, {
		next: "create",
		week: "2026-11-16",
	}),
});

const show = async (gate: Gate, link?: FixLink): Promise<HTMLElement> => {
	render(
		<I18nextProvider i18n={authTestI18n}>
			<MemoryRouterHarness>
				<ReadinessGateCallout gate={gate} link={link} />
			</MemoryRouterHarness>
		</I18nextProvider>
	);
	return screen.findByRole("note");
};

const gate = (...args: Parameters<typeof gateOf>): Gate => {
	const chosen = gateOf(...args);
	if (!chosen) throw new Error("No gate");
	return chosen;
};

describe("ReadinessGateCallout", () => {
	it("given_nothingSetUp_when_shown_then_warnsAndLinksToTheShiftsTab", async () => {
		const nothing = gate(NOTHING, BOTH, "setup");
		const note = await show(nothing, linkTo(nothing));

		expect(note).toHaveClass("bg-warning-50");
		expect(note).toHaveTextContent(
			"Kitchen has no shifts or staffing constraints yet. A schedule needs both."
		);
		expect(
			await within(note).findByRole("link", { name: "Set up Kitchen" })
		).toHaveAttribute(
			"href",
			"/scheduling?view=shifts&branch=b-1&department=d-1&next=create&week=2026-11-16"
		);
	});

	it("given_shiftsButNoStaffing_when_shown_then_linksToTheConstraintsTab", async () => {
		const noStaffing = gate(NO_STAFFING, BOTH, "setup");
		const note = await show(noStaffing, linkTo(noStaffing));

		expect(note).toHaveTextContent(
			"Kitchen has shifts but no staffing constraint, so nobody would be rostered."
		);
		expect(
			await within(note).findByRole("link", {
				name: "Add a staffing constraint",
			})
		).toHaveAttribute(
			"href",
			"/scheduling?view=constraints&branch=b-1&department=d-1&next=create&week=2026-11-16"
		);
	});

	it("given_someoneWhoCannotFixIt_when_shownWithoutALink_then_saysWhoCan", async () => {
		const note = await show(gate(NO_STAFFING, NEITHER, "setup"));

		expect(note).toHaveTextContent(
			"Kitchen isn’t ready to schedule: it has no staffing constraint. Ask someone who manages Kitchen’s scheduling to add one."
		);
		expect(within(note).queryByRole("link")).toBeNull();
	});

	it("given_aDraftNoLongerReady_when_shownAtGenerate_then_saysItCantBeGenerated", async () => {
		const note = await show(gate(NOTHING, BOTH, "generate"));

		expect(note).toHaveTextContent(
			"Kitchen no longer has a shift, so this schedule can’t be generated."
		);
	});
});
