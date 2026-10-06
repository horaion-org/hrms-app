import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { useState } from "react";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import type { FunctionComponent } from "@/common/types";
import {
	includedShifts,
	scheduleDraftReducer,
	seedScheduleDraft,
} from "@/features/scheduling/scheduleDraft";
import { ShiftAllocationTable } from "@/features/scheduling/ShiftAllocationTable";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const Harness = (): FunctionComponent => {
	const [draft, setDraft] = useState(seedScheduleDraft);
	return (
		<ShiftAllocationTable
			shifts={includedShifts(draft)}
			onAllocationChange={(shiftId, roleId, allocated) => {
				setDraft((current) =>
					scheduleDraftReducer(current, {
						type: "allocationChanged",
						shiftId,
						roleId,
						allocated,
					})
				);
			}}
		/>
	);
};

describe("ShiftAllocationTable", () => {
	it("given_shifts_when_rendered_then_showsLengthDaysAndAllocation", () => {
		render(<Harness />);

		const row = screen.getByRole("row", { name: /Front Desk AM/ });
		expect(row).toHaveTextContent("09:00 – 15:00");
		expect(row).toHaveTextContent("6 hrs");
		expect(row).toHaveTextContent("4/4 staff allocated");
		expect(row).toHaveTextContent("Weekdays");
		expect(
			screen.getByRole("row", { name: /Breakfast Prep/ })
		).toHaveTextContent("Mon, Wed, Fri, Sat");
	});

	it("given_aShortShift_when_aRoleIsRaised_then_theAllocationCompletes", async () => {
		const user = userEvent.setup();
		render(<Harness />);
		expect(screen.getByText("2/3 staff allocated")).toHaveAttribute(
			"data-status",
			"short"
		);

		await user.click(
			screen.getByRole("button", { name: "More Pastry Assistant" })
		);

		expect(screen.getByText("3/3 staff allocated")).toHaveAttribute(
			"data-status",
			"complete"
		);
	});

	it("given_aRoleAtZero_when_rendered_then_cannotGoLower", () => {
		render(<Harness />);

		expect(
			screen.getByRole("button", { name: "Fewer Pastry Assistant" })
		).toBeDisabled();
	});
});
