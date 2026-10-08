import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { TimeBlockGrid } from "@/features/scheduling/TimeBlockGrid";

beforeAll(async () => {
	await createInstance()
		.use(initReactI18next)
		.init({ lng: "en", resources: { en: { translation: en } } });
});

const ROLES = [
	{ roleId: "cashier", name: "Cashier" },
	{ roleId: "prep-cook", name: "Prep Cook" },
];

describe("TimeBlockGrid", () => {
	it("given_roles_when_rendered_then_hasAColumnEachAndASlotEveryHalfHour", () => {
		render(
			<TimeBlockGrid
				demand={{}}
				periodLabel="12 – 18 Oct 2026"
				roles={ROLES}
				onAutoFill={vi.fn()}
				onDemandChange={vi.fn()}
			/>
		);

		const table = screen.getByRole("table", {
			name: "Staffing demand by time block",
		});
		expect(
			within(table)
				.getAllByRole("columnheader")
				.map((cell) => cell.textContent)
		).toEqual(["Time", "Cashier", "Prep Cook"]);
		// 06:00 to 22:00 in half hours.
		expect(within(table).getAllByRole("spinbutton")).toHaveLength(32 * 2);
		expect(screen.getByText("12 – 18 Oct 2026")).toBeVisible();
	});

	it("given_demand_when_rendered_then_showsItInTheNamedCell", () => {
		render(
			<TimeBlockGrid
				demand={{ "06:30": { cashier: 4 } }}
				periodLabel="12 – 18 Oct 2026"
				roles={ROLES}
				onAutoFill={vi.fn()}
				onDemandChange={vi.fn()}
			/>
		);

		expect(
			screen.getByRole("spinbutton", { name: "Cashier, 06:30 – 07:00" })
		).toHaveValue(4);
		expect(
			screen.getByRole("spinbutton", { name: "Prep Cook, 06:30 – 07:00" })
		).toHaveValue(0);
	});

	it("given_aCell_when_edited_then_reportsAWholeNumberWithinLimits", () => {
		const onDemandChange = vi.fn();
		render(
			<TimeBlockGrid
				demand={{}}
				periodLabel="12 – 18 Oct 2026"
				roles={ROLES}
				onAutoFill={vi.fn()}
				onDemandChange={onDemandChange}
			/>
		);
		const cell = screen.getByRole("spinbutton", {
			name: "Prep Cook, 09:00 – 09:30",
		});

		fireEvent.change(cell, { target: { value: "7" } });
		fireEvent.change(cell, { target: { value: "250" } });
		fireEvent.change(cell, { target: { value: "" } });

		expect(onDemandChange.mock.calls).toEqual([
			["09:00", "prep-cook", 7],
			["09:00", "prep-cook", 99],
			["09:00", "prep-cook", 0],
		]);
	});

	it("given_aGroup_when_toggled_then_hidesAndShowsItsSlots", async () => {
		const user = userEvent.setup();
		render(
			<TimeBlockGrid
				demand={{}}
				periodLabel="12 – 18 Oct 2026"
				roles={ROLES}
				onAutoFill={vi.fn()}
				onDemandChange={vi.fn()}
			/>
		);
		const toggle = screen.getByRole("button", { name: /Early Morning/ });
		expect(toggle).toHaveAttribute("aria-expanded", "true");

		await user.click(toggle);

		expect(toggle).toHaveAttribute("aria-expanded", "false");
		expect(
			screen.queryByRole("spinbutton", { name: "Cashier, 06:00 – 06:30" })
		).toBeNull();

		await user.click(toggle);

		expect(
			screen.getByRole("spinbutton", { name: "Cashier, 06:00 – 06:30" })
		).toBeInTheDocument();
	});

	it("given_autoFill_when_clicked_then_asksForIt", async () => {
		const user = userEvent.setup();
		const onAutoFill = vi.fn();
		render(
			<TimeBlockGrid
				demand={{}}
				periodLabel="12 – 18 Oct 2026"
				roles={ROLES}
				onAutoFill={onAutoFill}
				onDemandChange={vi.fn()}
			/>
		);

		await user.click(screen.getByRole("button", { name: "Auto-fill" }));

		expect(onAutoFill).toHaveBeenCalledOnce();
	});
});
