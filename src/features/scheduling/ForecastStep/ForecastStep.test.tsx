import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import {
	ForecastStep,
	type ForecastStepProps,
} from "@/features/scheduling/ForecastStep";
import {
	ALLOCATION_FIXTURES,
	INCLUDED_SHIFT_IDS,
	SHIFT_FIXTURES,
} from "@/features/scheduling/shifts/fixtures";
import { includedShifts } from "@/features/scheduling/scheduleDraft";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const props = (
	overrides: Partial<ForecastStepProps> = {}
): ForecastStepProps => ({
	mode: "SHIFT",
	onModeChange: vi.fn(),
	shifts: includedShifts(
		{ includedShiftIds: INCLUDED_SHIFT_IDS },
		SHIFT_FIXTURES
	),
	allocations: ALLOCATION_FIXTURES,
	onAllocationChange: vi.fn(),
	demand: {},
	onDemandChange: vi.fn(),
	onAutoFill: vi.fn(),
	periodLabel: "12 – 18 Oct 2026",
	...overrides,
});

describe("ForecastStep", () => {
	it("given_byShift_when_rendered_then_showsTheAllocationTable", () => {
		render(<ForecastStep {...props()} />);

		expect(
			screen.getByRole("radiogroup", {
				name: "How would you like to define staffing demand?",
			})
		).toBeInTheDocument();
		expect(
			screen.getByRole("radio", { name: "By shift (recommended)" })
		).toBeChecked();
		expect(
			screen.getByRole("table", { name: "Staff allocation by shift" })
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
	});

	it("given_byShift_when_timeBlocksChosen_then_reportsTheMode", async () => {
		const user = userEvent.setup();
		const onModeChange = vi.fn();
		render(<ForecastStep {...props({ onModeChange })} />);

		await user.click(
			screen.getByRole("radio", { name: "Detailed time blocks" })
		);

		expect(onModeChange).toHaveBeenCalledWith("BLOCKS");
	});

	it("given_timeBlocks_when_rendered_then_showsTheGridForTheIncludedRoles", () => {
		render(<ForecastStep {...props({ mode: "BLOCKS" })} />);

		expect(
			screen.getByRole("table", { name: "Staffing demand by time block" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: "Duty Manager" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Use existing forecast" })
		).toBeDisabled();
	});
});
