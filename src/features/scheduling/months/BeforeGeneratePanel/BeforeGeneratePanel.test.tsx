import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import type { MonthGenerationCheck } from "@/features/scheduling/months/api";
import {
	BeforeGeneratePanel,
	type BeforeGeneratePanelProps,
} from "@/features/scheduling/months/BeforeGeneratePanel";
import { monthGenerationCheckFixture } from "@/features/scheduling/months/fixtures";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const renderPanel = (
	check: MonthGenerationCheck = monthGenerationCheckFixture(),
	props: Partial<BeforeGeneratePanelProps> = {}
): { onGenerate: ReturnType<typeof vi.fn> } => {
	const onGenerate = vi.fn();
	render(
		<BeforeGeneratePanel
			check={check}
			generating={false}
			month="2026-12"
			onGenerate={onGenerate}
			{...props}
		/>
	);
	return { onGenerate };
};

const generate = (): HTMLElement =>
	screen.getByRole("button", { name: "Generate December" });

describe("BeforeGeneratePanel", () => {
	it("given_aReadyDepartmentWithLeave_when_rendered_then_threeLinesAndGenerateRuns", async () => {
		const { onGenerate } = renderPanel();

		expect(
			screen.getByRole("heading", { name: "Before you generate December" })
		).toBeInTheDocument();
		expect(screen.getByText("Kitchen has 3 shifts.")).toBeInTheDocument();
		expect(
			screen.getByText(
				"“Morning cover” puts people on Breakfast Prep and Front Desk AM."
			)
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"2 people have approved leave in December. 1 more request is waiting for a decision."
			)
		).toBeInTheDocument();
		await userEvent.click(generate());
		expect(onGenerate).toHaveBeenCalledTimes(1);
	});

	it("given_noApprovedLeave_when_rendered_then_aWarningThatNeverBlocks", () => {
		renderPanel(
			monthGenerationCheckFixture({
				peopleWithApprovedLeave: 0,
				leaveRequestsWaiting: 1,
			})
		);

		expect(
			screen.getByText(
				"No approved leave in December. If people plan to take leave, approve it first: leave approved later changes the roster. 1 request is waiting for a decision."
			)
		).toBeInTheDocument();
		expect(generate()).toBeEnabled();
	});

	it("given_noStaffingConstraint_when_rendered_then_generateIsDisabledWithTheReason", () => {
		renderPanel(
			monthGenerationCheckFixture({
				ready: false,
				missing: ["STAFFING_CONSTRAINT"],
				staffingConstraint: null,
			})
		);

		expect(
			screen.getByText(
				"No constraint puts people on a shift, so nobody would be rostered."
			)
		).toBeInTheDocument();
		expect(generate()).toBeDisabled();
		expect(generate()).toHaveAccessibleDescription(
			"Kitchen can’t be generated until a constraint puts people on a shift."
		);
	});

	it("given_noShift_when_rendered_then_theShiftLineAndReasonSaySo", () => {
		renderPanel(
			monthGenerationCheckFixture({
				ready: false,
				missing: ["SHIFT", "STAFFING_CONSTRAINT"],
				shiftCount: 0,
				staffingConstraint: null,
			})
		);

		expect(screen.getByText("Kitchen has no shifts.")).toBeInTheDocument();
		expect(generate()).toHaveAccessibleDescription(
			"Kitchen can’t be generated until it has a shift."
		);
	});

	it("given_aBlockedNote_when_rendered_then_generateIsDisabledWithIt", () => {
		renderPanel(undefined, { blockedNote: "You can’t create schedules here." });

		expect(generate()).toBeDisabled();
		expect(generate()).toHaveAccessibleDescription(
			"You can’t create schedules here."
		);
	});

	it("given_theListsLoading_when_rendered_then_generateWaitsWithoutANote", () => {
		renderPanel(undefined, { waiting: true });

		expect(generate()).toBeDisabled();
		expect(generate()).not.toHaveAttribute("aria-describedby");
	});

	it("given_links_when_rendered_then_eachLineOffersItsLabelledLink", () => {
		renderPanel(monthGenerationCheckFixture({ staffingConstraint: null }), {
			links: {
				shifts: (label) => <a href="/shifts">{label}</a>,
				constraints: (label) => <a href="/constraints">{label}</a>,
			},
		});

		expect(
			screen.getByRole("link", { name: "Edit shifts" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Add a staffing constraint" })
		).toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: "Open leave requests" })
		).toBeNull();
	});
});
